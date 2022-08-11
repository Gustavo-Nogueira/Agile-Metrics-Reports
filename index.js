import chalk from 'chalk';
import axios from "axios";
import fs from 'fs/promises';
import papaparse from 'papaparse';
import CONSTANTS from './constants.js';
import ENVIRONMENTS from './environments.js';
import CONFIGURATIONS from './configurations.js';

/**
 * Backlog Issue Object 
 *  { number, url, title, state, labels, assignees, created_at, closed_at, todo_at, doing_at, done_at, events, points, sprints }
 * 
 * Skipped Issue Object 
 *  { number, url, title, state, labels, created_at, closed_at }
 * 
 * Sprint Object 
 *  { number, started_at, ended_at }
 */

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractDataFromRepository() {
    try {
        const [owner, repo] = ENVIRONMENTS.REPOSITORY_URL.split('/').slice(3);
        const GH_AUTH = { 'Authorization': `token ${ENVIRONMENTS.GITHUB_TOKEN}` };
        const ZH_AUTH = { 'X-Authentication-Token': `${ENVIRONMENTS.ZENHUB_TOKEN}` };

        /* Retrieve repository data */
        process.stdout.write(chalk.white('Recuperando dados do repositório...'));
        const resRepository = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers: { ...GH_AUTH } });
        const repositoryId = resRepository.data.id;
        process.stdout.write(chalk.green(`OK\n`));

        /* Retrieve all issues of repository */
        process.stdout.write(chalk.white('Recuperando as issues do repositório...'));
        let page = 1;
        let recoveredAll = false;
        const issues = [];
        while (!recoveredAll) {
            const params = `state=all&per_page=100&page=${page}`;
            const url = `https://api.github.com/repos/${owner}/${repo}/issues?${params}`;
            const res = await axios.get(url, { headers: { ...GH_AUTH } });
            const serverTime = res.headers['date'];
            const resetTime = res.headers['x-ratelimit-reset'];
            const remaining = res.headers['x-ratelimit-remaining'];
            const usecReset = (new Date(resetTime * 1000) - new Date(serverTime)) + 1000;

            if (res.data.length === 0) { recoveredAll = true; continue; }

            const pageIssues = res.data.map((issue) => ({
                number: issue.number,
                title: issue.title,
                state: issue.state,
                url: issue.html_url,
                labels: issue.labels,
                assignees: issue.assignees,
                created_at: new Date(issue.created_at),
                closed_at: issue.closed_at && new Date(issue.closed_at),
            }));
            issues.push(...pageIssues);

            if (remaining <= 1) {
                process.stdout.write(chalk.yellow(`\nLimite de requisições atingido. Aguarde ${usecReset / 1000} segundos...`));
                await sleep(usecReset);
                process.stdout.write(chalk.yellow(`Voltando...`));
            }

            page++;
        }
        process.stdout.write(chalk.green(`OK\n`));

        /* Separate issue types */
        process.stdout.write(chalk.white('Separando as issues de backlog e skipped...'));
        const backlogIssues = issues.filter((issue) =>
            issue.labels.reduce((pre, curr) => pre || CONFIGURATIONS.BACKLOG_LABELS.includes(curr.name), false));
        const skippedIssues = issues.filter((issue) =>
            !issue.labels.reduce((pre, curr) => pre || CONFIGURATIONS.BACKLOG_LABELS.includes(curr.name), false));
        process.stdout.write(chalk.green(`OK\n`));

        /* Retrieve events from issues */
        process.stdout.write(chalk.white('Recuperando eventos das issues...'));
        for (const issue of backlogIssues) {
            const url = `https://api.zenhub.com/p1/repositories/${repositoryId}/issues/${issue.number}/events`;
            const res = await axios.get(url, { headers: { ...ZH_AUTH } });
            const serverTime = res.headers['date'];
            const resetTime = res.headers['x-ratelimit-reset'];
            const remaining = res.headers['x-ratelimit-limit'] - res.headers['x-ratelimit-used'];
            const usecReset = (new Date(resetTime * 1000) - new Date(serverTime)) + 1000;

            if (res.data && res.data.length > 0) {
                issue['events'] = res.data;
            } else {
                issue['events'] = [];
            }

            if (remaining <= 1) {
                process.stdout.write(chalk.yellow(`\nLimite de requisições atingido. Aguarde ${usecReset / 1000} segundos...`));
                await sleep(usecReset);
                process.stdout.write(chalk.yellow(`Voltando...`));
            }
        }
        process.stdout.write(chalk.green(`OK\n`));

        /* Handle issue events */
        process.stdout.write(chalk.white('Tratando eventos das issues...'));
        for (const issue of backlogIssues) {
            // finding todo at
            let todo_at = null;
            for (const event of issue.events) {
                if (event.type === 'transferIssue') {
                    if (CONFIGURATIONS.TODO_PIPELINE.includes(event.to_pipeline.name)) {
                        todo_at = new Date(event.created_at);
                    }
                }
            }
            issue['todo_at'] = todo_at || issue.created_at;

            // finding doing at
            let doing_at = null;
            for (const event of issue.events) {
                if (event.type === 'transferIssue') {
                    if (CONFIGURATIONS.DOING_PIPELINE.includes(event.to_pipeline.name)) {
                        doing_at = new Date(event.created_at);
                    }
                }
            }
            issue['doing_at'] = doing_at;

            // finding done at
            let done_at = null;
            for (const event of issue.events) {
                if (event.type === 'transferIssue') {
                    if (CONFIGURATIONS.DONE_PIPELINE.includes(event.to_pipeline.name)) {
                        done_at = new Date(event.created_at);
                    }
                }
            }
            issue['done_at'] = done_at || issue.closed_at;

            // fix doing at if necessary
            issue['doing_at'] = !issue['doing_at'] && issue['done_at'] ? issue['done_at'] : issue['doing_at'];

            // finding point estimate
            let points = null;
            for (const event of issue.events) {
                if (event.type === 'estimateIssue' && event.to_estimate?.value) {
                    points = event.to_estimate.value;
                    break;
                }
            }
            issue['points'] = points;
        }
        process.stdout.write(chalk.green(`OK\n`));

        /* Make completed sprints */
        process.stdout.write(chalk.white('Gerando sprints...'));
        let sprintNumber = 1;
        const sprints = [];
        let currentDate = new Date(CONFIGURATIONS.START_DATE);
        const endDate = new Date(CONFIGURATIONS.END_DATE);
        while (currentDate <= endDate) {
            const sprintStart = currentDate;
            const sprintEnd = new Date(sprintStart.getTime() + CONSTANTS.DAY_MS * CONFIGURATIONS.SPRINT_DURATION);
            sprints.push({ number: sprintNumber++, started_at: sprintStart, ended_at: sprintEnd });
            currentDate = sprintEnd;
        }
        process.stdout.write(chalk.green(`OK\n`));

        /* Find issue sprints */
        process.stdout.write(chalk.white('Definindo sprints das issues...'));
        backlogIssues.forEach((issue) => {
            let issueSprints = [];
            if (issue.doing_at) {
                const doing_at = new Date(issue.doing_at);
                const done_at = issue.done_at && new Date(issue.done_at);
                issueSprints = sprints.filter((s) => {
                    const hasIntersec = done_at && !(new Date(s.started_at) > done_at || doing_at > new Date(s.ended_at));
                    const isPending = !done_at && !(doing_at > new Date(s.ended_at));
                    return (hasIntersec || isPending);
                }).map(({ number }) => number).sort();
            }
            issue['sprints'] = issueSprints;
        });
        process.stdout.write(chalk.green(`OK\n`));

        return { backlogIssues, skippedIssues, sprints };

    } catch (error) {
        process.stdout.write(chalk.red(`${JSON.stringify({ error })}\n`));
        return null;
    }
}

async function makeBacklogReport(issues, datetime) {
    const report = issues.map((issue) => {
        let lead_time = null;
        let cycle_time = null;
        if (issue.todo_at && issue.done_at) {
            lead_time = Math.floor(Math.abs(new Date(issue.done_at) - new Date(issue.todo_at)) / CONSTANTS.DAY_MS);
        }
        if (issue.doing_at && issue.done_at) {
            cycle_time = Math.floor(Math.abs(new Date(issue.done_at) - new Date(issue.doing_at)) / CONSTANTS.DAY_MS);
        }
        return {
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.url,
            sprint: issue.sprints.join('-'),
            points: issue.points,
            todo_at: issue.todo_at && new Date(issue.todo_at).toLocaleString(),
            doing_at: issue.doing_at && new Date(issue.doing_at).toLocaleString(),
            done_at: issue.done_at && new Date(issue.done_at).toLocaleString(),
            lead_time,
            cycle_time
        };
    });
    const csv = papaparse.unparse(report, { delimiter: ',' });
    await fs.writeFile(`reports/${datetime}_backlog_report.csv`, csv);
}

async function makeSkippedReport(issues, datetime) {
    const report = issues.map((issue) => {
        return {
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.url,
        };
    });
    const csv = papaparse.unparse(report, { delimiter: ',' });
    await fs.writeFile(`reports/${datetime}_skipped_report.csv`, csv);
}

async function makeSprintsReport(issues, sprints, datetime) {
    const report = sprints.map((sprint) => {
        const sprintIssues = issues.filter((i) => i.sprints.includes(sprint.number));
        const total_issues = sprintIssues.length;
        const total_points = sprintIssues.reduce((acc, i) => (acc + i.points), 0);
        const throughput = sprintIssues.filter((i) => i.done_at && (sprint.started_at <= new Date(i.done_at) && new Date(i.done_at) <= sprint.ended_at)).length;
        const velocity = sprintIssues.filter((i) => i.done_at && (sprint.started_at <= new Date(i.done_at) && new Date(i.done_at) <= sprint.ended_at))
            .reduce((acc, i) => (acc + i.points), 0);
        return {
            number: sprint.number,
            started_at: new Date(sprint.started_at).toLocaleDateString(),
            ended_at: new Date(sprint.ended_at).toLocaleDateString(),
            total_issues,
            total_points,
            throughput,
            velocity,
        };
    });
    const csv = papaparse.unparse(report, { delimiter: ',' });
    await fs.writeFile(`reports/${datetime}_sprints_report.csv`, csv);
}

async function makeDailyReport(issues, sprints, datetime) {
    const report = [];
    let currentDate = new Date(CONFIGURATIONS.START_DATE);
    const endDate = new Date(CONFIGURATIONS.END_DATE);
    while (currentDate <= endDate) {
        const day = new Date(currentDate).toLocaleDateString();
        const sprint = sprints.find((s) => new Date(s.started_at) <= currentDate && currentDate <= new Date(s.ended_at))?.number;
        const number_todo = issues.filter((i) => new Date(i.todo_at).toDateString() === currentDate.toDateString()).length;
        const number_doing = issues.filter((i) => new Date(i.doing_at).toDateString() === currentDate.toDateString()).length;
        const number_done = issues.filter((i) => new Date(i.done_at).toDateString() === currentDate.toDateString()).length;
        const points_doing = issues.filter((i) => new Date(i.doing_at).toDateString() === currentDate.toDateString())
            .reduce((acc, i) => (acc + i.points), 0);
        const points_done = issues.filter((i) => new Date(i.done_at).toDateString() === currentDate.toDateString())
            .reduce((acc, i) => (acc + i.points), 0);
        const number_wtd = issues.filter((i) => (i.todo_at && new Date(i.todo_at) <= currentDate) && (!i.doing_at || currentDate <= new Date(i.doing_at))).length;
        const number_wip = issues.filter((i) => (i.doing_at && new Date(i.doing_at) <= currentDate) && (!i.done_at || currentDate <= new Date(i.done_at))).length;
        const number_wdn = issues.filter((i) => (i.done_at && new Date(i.done_at) <= currentDate)).length;
        const points_wip = issues.filter((i) => (i.doing_at && new Date(i.doing_at) <= currentDate) && (!i.done_at || currentDate <= new Date(i.done_at)))
            .reduce((acc, i) => (acc + i.points), 0);
        const points_wdn = issues.filter((i) => (i.done_at && new Date(i.done_at) <= currentDate))
            .reduce((acc, i) => (acc + i.points), 0);

        report.push({ day, sprint, number_todo, number_doing, number_done, points_doing, points_done, number_wtd, number_wip, number_wdn, points_wip, points_wdn });

        currentDate = new Date(currentDate.getTime() + CONSTANTS.DAY_MS);
    }
    const csv = papaparse.unparse(report, { delimiter: ',' });
    await fs.writeFile(`reports/${datetime}_daily_report.csv`, csv);
}

async function makeAssigneesReport(issues, sprints, datetime) {
    const report = [];
    sprints.forEach((sprint) => {
        const sprintIssues = issues.filter((issue) => issue.sprints.includes(sprint.number));
        sprintIssues.forEach((issue) => {
            issue.assignees.forEach((assignee) => {
                const sprintUserIndex = report.findIndex((line) => line.sprint === sprint.number && line.user === assignee.login);
                if (sprintUserIndex >= 0) {
                    const sprintUser = report[sprintUserIndex];
                    report[sprintUserIndex] = {
                        ...sprintUser,
                        issues: `${sprintUser.issues},${issue.number}`,
                        total_issues: sprintUser.total_issues + 1,
                        total_points: sprintUser.total_points + issue.points,
                    }
                } else {
                    report.push({
                        sprint: sprint.number,
                        user: assignee.login,
                        total_issues: 1,
                        total_points: issue.points,
                        issues: issue.number
                    });
                }
            });
        });
    });
    const csv = papaparse.unparse(report, { delimiter: ',' });
    await fs.writeFile(`reports/${datetime}_assignees_report.csv`, csv);
}

async function main() {
    const datetime = new Date().toLocaleString().replaceAll('/', '-').replaceAll(':', '-').replaceAll(' ', '_');

    const { backlogIssues, skippedIssues, sprints } = await extractDataFromRepository();

    process.stdout.write(chalk.white('Gerando Backlog Report...'));
    await makeBacklogReport(backlogIssues, datetime);
    process.stdout.write(chalk.green(`OK\n`));

    process.stdout.write(chalk.white('Gerando Skipped Report...'));
    await makeSkippedReport(skippedIssues, datetime);
    process.stdout.write(chalk.green(`OK\n`));

    process.stdout.write(chalk.white('Gerando Sprints Report...'));
    await makeSprintsReport(backlogIssues, sprints, datetime);
    process.stdout.write(chalk.green(`OK\n`));

    process.stdout.write(chalk.white('Gerando Daily Report...'));
    await makeDailyReport(backlogIssues, sprints, datetime);
    process.stdout.write(chalk.green(`OK\n`));

    process.stdout.write(chalk.white('Gerando Assignees Report...'));
    await makeAssigneesReport(backlogIssues, sprints, datetime);
    process.stdout.write(chalk.green(`OK\n`));
}

main();
