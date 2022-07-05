# Agile Metrics Reports

Gera relatórios com métricas ágeis e outras informações a partir das APIs do ZenHub e do GitHub.

## Rodando

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

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
|TODO_PIPELINE|Pipelines que representam as issues em `TODO`.|-|
|DOING_PIPELINE|Pipelines que representam as issues em `DOING`/`IN PROGRESS`.|-|
|DONE_PIPELINE|Pipelines que representam as issues em `DONE`.|-|
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

Relatório com informações e métricas de cada issue de backlog. O nome do arquivo gerado possui o formato `{datetime}_backlog_report.csv`. 

|Coluna|Descrição|
|------|---------|
|number|Número da issue no GitHub.|
|title|Título da issue.|
|state|Estado da issue(`open` ou `closed`).|
|url|URL de acesso da issue.|
|sprint|Sprint(s) em que a issue permaneceu `IN PROGRESS`.|
|points|Estimativa de pontos da issue (Story points).|
|todo_at|Data em que a issue foi criada ou entrou no pipeline `TODO`.|
|doing_at|Data em que a issue entrou no pipeline `IN PROGRESS`.| 
|done_at|Data em que a issue entrou no pipeline `DONE`.|
|lead_time|Lead time em dias da issue.| 
|cycle_time|Cycle time em dias da issue.|

### Sprints Report 

Relatório com informações e métricas relativas ao progresso do projeto em cada sprint. O nome do arquivo gerado possui o formato `{datetime}_sprints_report.csv`. 

|Coluna|Descrição|
|------|---------|
|sprint|Número de identificação da sprint.|
|started_at|Data em que a sprint foi iniciada.| 
|ended_at|Data em que a sprint foi concluída.|
|total_issues|Número de issues `IN PROGRESS` durante a sprint.|
|total_points|Quantidade de pontos das issues `IN PROGRESS` durante a sprint.|
|throughput|Número de issues concluídas durante a sprint.|
|velocity|Quantidade de pontos das issues concluídas durante a sprint.|

### Daily Report

Relatório com informações e métricas relativas ao progresso do projeto desde o dia `START_DATE` até o dia `END_DATE`. O nome do arquivo gerado possui o formato `{datetime}_daily_report.csv`. 

|Coluna|Descrição|
|------|---------|
|day|Dia da análise.|
|sprint|Sprint do dia em questão.|
|number_todo|Número de issues que entraram no pipeline `TODO` no dia em questão.| 
|number_doing|Número de issues que entraram no pipeline `IN PROGRESS` no dia em questão.|
|number_done|Número de issues que entraram no pipeline `DONE` no dia em questão.|
|points_doing|Quantidade de pontos que entraram no pipeline `IN PROGRESS` no dia em questão.|
|points_done|Quantidade de pontos que entraram no pipeline `DONE` no dia em questão.|
|number_wtd|Número de issues que estão no pipeline `TODO` no dia em questão ("Work in TODO").|
|number_wip|Número de issues que estão no pipeline `IN PROGRESS` no dia em questão ("Work in PROGRESS").|
|number_wdn|Número de issues que estão no pipeline `DONE` no dia em questão ("Work in DONE").|
|points_wip|Quantidade de pontos que estão no pipeline `IN PROGRESS` no dia em questão ("Work in PROGRESS").| 
|points_wdn|Quantidade de pontos que estão no pipeline `DONE` no dia em questão ("Work in DONE").|

### Skipped Report 

Para fins de validação, este relatório possui as issues ignoradas, ou seja, issues que não estão ralacionadas ao backlog do produto. O nome do arquivo gerado possui o formato `{datetime}_skipped_report.csv`. 

|Coluna|Descrição|
|------|---------|
|number|Número da issue no GitHub.|
|title|Título da issue.|
|state|Estado da issue(`open` ou `closed`).|
|url|URL de acesso da issue.|
