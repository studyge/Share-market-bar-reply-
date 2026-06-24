# Phase 6: GitHub Actions Data Pipeline

You want to eliminate the need for a local Python server by moving the `tvDatafeed` execution into the cloud using **GitHub Actions**. This is an incredibly creative, 100% serverless architecture!

**Is it possible?** Yes! Here is exactly how it will work:

## The Architecture
1. **Trigger**: When you search for a symbol in the app, the React app makes an API call to GitHub to trigger a custom Actions Workflow.
2. **Execute**: A GitHub Actions runner (an Ubuntu server in the cloud) spins up, installs Python and `tvDatafeed`, and fetches your exact symbol data. (This completely avoids your macOS SSL issues!).
3. **Store**: The Python script saves the fetched data as a JSON file and the Action automatically pushes/commits it to a `data` folder in your GitHub repository.
4. **Load**: Your React app simply waits a few seconds and then downloads the JSON directly from the raw GitHub URL, saving it to your local SQLite database and plotting it on the chart.

## Implementation Steps

### 1. Python Cloud Script (`scripts/fetch_tv.py`)
- Rewrite your Python script to accept command-line arguments (e.g., `--symbol NIFTY` or `--group nifty50`) and save the output as clean JSON files.
- Add logic to handle bulk requests (fetching 50 or 500 symbols sequentially).

### 2. GitHub Actions Workflow (`.github/workflows/fetch.yml`)
- Create a workflow with a `workflow_dispatch` trigger (meaning it can be triggered via API).
- It will run the Python script for the requested symbol(s) and commit the resulting JSON file(s) back to the repository.

### 3. React Frontend Update (SearchScreen)
- Add new **Bulk Import** UI buttons: "Import NIFTY 50", "Import NIFTY 500", and "Sector-wise Import".
- Instead of hitting `localhost:5000`, the app will send a secure POST request to GitHub to start the workflow with the correct parameters.
- It will show a loading state while polling GitHub for the finished data files.

## User Review Required

> [!WARNING]
> To trigger a GitHub Action from the React app, the app needs permission to talk to your GitHub account. 
> 
> You will need to generate a **GitHub Personal Access Token (PAT)** with `repo` or `workflow` permissions and paste it into a `.env` file in this project. Is this acceptable to you?

> [!NOTE]
> GitHub Actions take about **15 to 40 seconds** to spin up, install Python packages, fetch the data, and commit the file. This means there will be a roughly 30-second wait time whenever you search for a *new* symbol. Is this delay acceptable for your workflow?

Please review this plan. If you approve, I will write the GitHub Action and the new cloud Python script!
