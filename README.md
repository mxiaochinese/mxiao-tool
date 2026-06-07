# MXiao Tool

Internal tool for MXiao Chinese. The first module is **Xuat lich khai giang**: import an Excel/CSV schedule, edit rows, filter online/offline classes, and export a polished 1:1 launch schedule social post.

## Features

- Import `.xlsx`, `.xls`, or `.csv` files.
- Auto-detect schedule rows from MXiao-style sheets with merged course cells and `ONLINE` / `OFFLINE` separator rows.
- Edit course group, mode, class code, location/teacher, schedule, start date, and status.
- Export modes: full online/offline, online only, offline only.
- Export layout is a 1080 x 1080 social post based on MXiao launch schedule references.
- Font system: Phudu is the primary poster/course font; Gilroy is the secondary UI/body font.
- Poster preview grouped by:
  - Vo long `(0-HSK2)`
  - Tang toc `(HSK2-HSK3)`
  - Co ban `(HSK3)`
  - Nang cao `(HSK4)`
  - Thanh thao `(HSK5)`
- Export preview to PNG or print/save as PDF.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy To GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Push the repository to GitHub with the repo name `mxiao-tool`.
2. In GitHub, open **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. Every push to `main` will build and publish the app.

The live URL will be:

```text
https://<github-username>.github.io/mxiao-tool/
```
