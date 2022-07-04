const CONFIGURATIONS = {
    /* Zenhub Default */
    /* ZENHUB_PIPELINES: ['New Issues', 'Epics', 'Icebox', 'Product Backlog', 'Sprint Backlog', 'In Progress', 'Review/QA', 'Done', 'Closed'],
    TODO_PIPELINE: ['New Issues', 'Product Backlog'],
    DOING_PIPELINE: ['Sprint Backlog', 'In Progress', 'Review/QA'],
    DONE_PIPELINE: ['Done', 'Closed'], */

    ZENHUB_PIPELINES: ['New Issues', 'Epics', 'Icebox', 'Product Backlog', 'Sprint Backlog', 'In Progress', 'Review', 'QA (Functional Testing)', 'Done', 'Closed'],
    TODO_PIPELINE: ['New Issues', 'Product Backlog'],
    DOING_PIPELINE: ['Sprint Backlog', 'In Progress', 'Review', 'QA (Functional Testing)'],
    DONE_PIPELINE: ['Done', 'Closed'],
    BACKLOG_LABELS: ['US', 'BUG', 'ENHANCEMENT'],
    SPRINT_DURATION: 7,
    START_DATE: '02/24/2022',
    END_DATE: '05/04/2022',
};

CONFIGURATIONS.END_DATE = CONFIGURATIONS.END_DATE || new Date().toDateString();

export default CONFIGURATIONS;