## હરિપ્રબોધમ કથામૃત

---

## Global (All Pages)

### Features
- Royal dark theme (navy background + gold accents)
- Gujarati-first typography (clear, bold, readable)
- Responsive design (mobile + tablet + desktop)
- Fast loading pages
- SEO-friendly URLs and meta
- Accessibility basics (keyboard focus, readable contrast)

### Navigation
- Top navbar:
  - Home
  - Search
  - Feed

- Optional footer:
  - Copyright
  - Quick links
  - Social links (optional)

---

## Home Page

### Features
- Hero section with:
  - Site title (Gujarati)
  - Short subtitle/tagline
  - Featured quote (rotating optional)
- Featured articles section (latest / pinned)
- Category highlights (top categories)
- Latest articles list (paginated or infinite scroll)

### Article Card Display
- Title (Gujarati)
- Short excerpt (2–3 lines)
- Category badge
- Publish date
- Read more button/link

### Sorting / Pagination
- Sort by:
  - Latest (default)
  - Most viewed (optional)
  - Featured (optional)
- Pagination:
  - Page numbers OR infinite scroll

---

## Search Page

### Features
- Search bar with keyword input
- Instant results (optional) or submit button
- Filters:
  - Category
  - Date range (optional)
  - Author (optional)
- Results summary:
  - “X results found for ‘keyword’”

### Search Results Display
- Same card layout as Home Page
- Highlight matched keyword (optional)
- Empty state message when no results

---

## Categories Page

### Features
- List all categories
- Category count (number of articles per category)
- Click category to open category detail page

### Category List Display
- Category name (Gujarati)
- Article count
- Optional category description

---

## Category Detail Page

### Features
- Category title + description
- Article list filtered by the selected category
- Sorting:
  - Latest (default)
  - Popular (optional)
- Pagination:
  - Page numbers OR infinite scroll

### Article List Display
- Card layout (same as Home/Search)

---

## Article Detail Page

### Features
- Full article view
- Clean reading layout (focused content area)
- Optional table of contents (for long articles)
- Next/Previous navigation (optional)

### Article Display
- Title (Gujarati)
- Author name (optional)
- Publish date
- Category badge
- Featured image (optional)
- Full content body
- Tags (optional)

### Related Content
- Related articles (same category)
- “More from this category” link

### Share (Optional)
- Copy link
- WhatsApp share
- Facebook share

---

## Contact Page

### Features
- Contact form OR contact details only
- Form fields (if enabled):
  - Name
  - Email
  - Message
- Success / error confirmation message

---

## Admin (Optional)

### Manage Articles
- Add new article
- Edit existing article
- Delete with confirmation
- Draft vs Publish status

### Article Fields
- Title
- Slug (auto-generated optional)
- Category (dropdown)
- Featured image
- Content (Markdown editor)
- Publish date (auto/default now)
- Tags (optional)

### Manage Categories
- Add category
- Edit category
- Delete category (block if articles exist, optional)

---

## Content Model (Data)

### Article
- id
- title
- slug
- category
- excerpt
- content (markdown)
- featuredImage
- publishDate
- author (optional)
- tags (optional)
- featured (boolean, optional)

### Category
- id
- name
- slug
- description (optional)

---

## Non-Functional Requirements

### Performance
- Optimize images (lazy load)
- Cache pages (optional)
- Minimize scripts

### Security
- Form spam protection (captcha optional)
- Admin authentication (if admin enabled)

### SEO
- Metadata per page
- OpenGraph image (optional)
- Sitemap generation (optional)