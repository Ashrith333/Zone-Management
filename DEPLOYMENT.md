# Quick Deployment Guide - GitHub Pages

## Option 1: Using GitHub Web Interface (Easiest)

1. **Create a new repository on GitHub**
   - Go to github.com → Click "+" → New repository
   - Name it (e.g., `zone-management`)
   - Make it **Public** (required for free GitHub Pages)
   - Click "Create repository"

2. **Upload files via web interface**
   - Click "uploading an existing file"
   - Drag and drop these files:
     - `index.html`
     - `styles.css`
     - `app.js`
     - `data.js`
   - Commit with message "Initial commit"
   - Click "Commit changes"

3. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `/ (root)`
   - Click Save

4. **Your site is live!**
   - URL: `https://YOUR_USERNAME.github.io/zone-management/`

## Option 2: Using Git Command Line

```bash
# Navigate to your project folder
cd "/Users/ash/Desktop/accompany health/website 3"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Zone Management Tool"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main

# Then enable Pages in GitHub Settings → Pages
```

## Troubleshooting

**Site not loading?**
- Wait 5-10 minutes after enabling Pages
- Check Settings → Pages to see if it's building
- Make sure `index.html` is in the root folder

**404 Error?**
- Verify the repository name matches the URL
- Check that the branch is set to `main` in Pages settings

**Changes not showing?**
- GitHub Pages can take a few minutes to update
- Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
