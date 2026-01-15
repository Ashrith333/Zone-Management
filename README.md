# Zone Management Tool

A web-based tool for managing clinical zones, provider assignments, and patient coverage for Accompany Health.

## Features

- **Zone Management**: Create, edit, and delete zones with ZIP code assignments
- **Provider Assignment**: Assign providers to zones with date ranges and active days
- **Coverage Timeline**: Visual timeline showing provider coverage and gaps
- **Patient Management**: View patients by zone with search functionality
- **Dashboard Overview**: Comprehensive view of all zones with key metrics

## Deployment to GitHub Pages

### Step 1: Initialize Git Repository

If you haven't already, initialize a git repository in this folder:

```bash
cd "/Users/ash/Desktop/accompany health/website 3"
git init
```

### Step 2: Add and Commit Files

```bash
git add .
git commit -m "Initial commit: Zone Management Tool"
```

### Step 3: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right, then select "New repository"
3. Name your repository (e.g., `zone-management-tool`)
4. **Do NOT** initialize with README, .gitignore, or license (we already have files)
5. Click "Create repository"

### Step 4: Connect Local Repository to GitHub

GitHub will show you commands. Run these (replace `YOUR_USERNAME` and `YOUR_REPO_NAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

### Step 6: Access Your Live Site

GitHub will provide a URL like:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

It may take a few minutes for the site to be available.

## Local Development

Simply open `index.html` in a web browser, or use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server
```

Then visit `http://localhost:8000`

## File Structure

```
.
├── index.html      # Main HTML file
├── styles.css      # All styling
├── app.js          # Application logic
├── data.js         # Dummy data and helper functions
└── README.md       # This file
```

## Notes

- This is a static site (HTML, CSS, JavaScript) - no build process required
- All data is stored in `data.js` - in production, this would connect to a backend API
- Font Awesome icons are loaded from CDN
- The app works entirely client-side
