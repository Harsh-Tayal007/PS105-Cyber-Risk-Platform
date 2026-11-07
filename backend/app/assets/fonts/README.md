# PS105 Typography & Font Management

This directory (`backend/app/assets/fonts/`) is configured as an optional local font directory for ReportLab PDF report generation.

---

## 1. Typography Selection & Hierarchy

The PS105 reporting engine and frontend design system use a warm, consulting-grade editorial typographical hierarchy:

1. **Serif (Headings & Formal Cover):**
   * Primary: **Newsreader** (Google Fonts / Production Type) – SIL Open Font License 1.1
   * System Fallbacks: Georgia, Times New Roman, Times-Roman (standard PDF Type 1)
2. **Sans-Serif (Body Prose & Tables):**
   * Primary: **IBM Plex Sans** (IBM) – SIL Open Font License 1.1
   * Alternate: **DM Sans** (Colophon Foundry) – SIL Open Font License 1.1
   * System Fallbacks: Segoe UI, Arial, Helvetica (standard PDF Type 1)
3. **Monospace (CPE Identifiers, Tokens, Codes):**
   * Primary: **IBM Plex Mono** (IBM) – SIL Open Font License 1.1
   * System Fallbacks: Consolas, Courier (standard PDF Type 1)

---

## 2. Licensing Compliance

All primary custom fonts used in PS105 are distributed under the **SIL Open Font License (OFL) Version 1.1**, permitting free academic, commercial, and redistribution use:

* **Newsreader:** Designed by Production Type ([SIL Open Font License 1.1](https://scripts.sil.org/OFL))
* **IBM Plex Sans & Mono:** Designed by Mike Abbink / Bold Monday for IBM ([SIL Open Font License 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt))
* **DM Sans:** Designed by Colophon Foundry ([SIL Open Font License 1.1](https://scripts.sil.org/OFL))

---

## 3. Dynamic Font Resolution & Fallback Engine

The report service (`backend/app/services/report_service.py`) dynamically queries the following path candidates at runtime:
1. `backend/app/assets/fonts/` (project-local bundle)
2. `C:/Windows/Fonts` (Windows host systems)
3. `/usr/share/fonts/truetype/` and `/usr/share/fonts/dejavu/` (Linux / container systems)
4. `/Library/Fonts` (macOS systems)
5. Built-in ReportLab standard Type 1 fonts (`Helvetica`, `Times-Roman`, `Courier`)

If localized TrueType font files are absent, the engine falls back to available system fonts, and automatically tests glyph availability for international currency symbols (e.g., the Indian Rupee symbol `₹`, falling back to `Rs.` if unmapped).

---

## 4. Downloading Local Fonts (Optional)

To bundle local TrueType binaries in this directory:
```bash
# Download Newsreader
curl -L -o backend/app/assets/fonts/Newsreader-Regular.ttf https://github.com/google/fonts/raw/main/ofl/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf
curl -L -o backend/app/assets/fonts/Newsreader-Bold.ttf https://github.com/google/fonts/raw/main/ofl/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf

# Download IBM Plex Sans
curl -L -o backend/app/assets/fonts/IBMPlexSans-Regular.ttf https://github.com/google/fonts/raw/main/ofl/ibmplexsans/IBMPlexSans-Regular.ttf
curl -L -o backend/app/assets/fonts/IBMPlexSans-Bold.ttf https://github.com/google/fonts/raw/main/ofl/ibmplexsans/IBMPlexSans-Bold.ttf
```
*(Note: Binary `.ttf` files are ignored by Git in root `.gitignore` to maintain lightweight repository distribution).*
