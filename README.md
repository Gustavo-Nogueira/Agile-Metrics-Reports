# Agile Metrics Reports

Gera relatórios com métricas ágeis e outras informações a partir das APIs do ZenHub e do GitHub.

## Rodando

### 1. Variáveis de Ambiente

Crei um arquivo `.env` na raiz do projeto com as seguintes variáveis:

|Variável|Descrição|Observação|
|--------|---------|----------|
|REPOSITORY_URL|URL do repositório do projeto no GitHub.|Formato: https://github.com/:owner/:repo |
|ZENHUB_TOKEN|Token de acesso à API do ZenHub.|Pode ser gerado a partir da seção **API Tokens** do seu [Dashboard](https://app.zenhub.com/login) ZenHub.|
|GITHUB_TOKEN|Token de acesso à API do GitHub. |[Como gerar ?](https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)|

### 2. Configurações

Acesse o arquivo `configurations.js` e adicione as configurações necessárias.

|Variável|Descrição|Observação|
|--------|---------|----------|
|ZENHUB_PIPELINES|Pipelines definidas no ZenHub do repositório.|-|
|TODO_PIPELINE|Pipelines que representam as issues em TODO.|-|
|DOING_PIPELINE|Pipelines que representam as issues em DOING/IN PROGRESS.|-|
|DONE_PIPELINE|Pipelines que representam as issues em DONE.|-|
|BACKLOG_LABELS|Labels que representam uma issue de backlog.|-|
|SPRINT_DURATION|Duração em dias de cada sprint.|-|
|START_DATE|Data de início da análise.|Exemplo: Início da primeira sprint. Formato: MM/DD/YYYY.|
|END_DATE|Data de término da análise.|Exemplo: Término da última sprint. Formato: MM/DD/YYYY. Default: data atual.|

### 3. Instalando Dependências

```
npm install
```

### 4. Executando

```
node index.js
```
 
## Relatórios

### Backlog Report 

number, title, state, url, sprint, points, todo_at, doing_at, done_at, lead_time, cycle_time

### Sprints Report 

sprint, started_at, ended_at, total_issues, total_points, throughput, velocity

### Daily Report

day, sprint, number_todo, number_doing, number_done, points_doing, points_done, number_wtd, number_wip, number_wdn, points_wip, points_wdn

### Skipped Report 

number, title, state, url
