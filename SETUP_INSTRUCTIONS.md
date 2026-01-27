# 🚀 Setup Instructions for Organ-on-Chip Lab Website

## ✅ Project Created Successfully!

Your Next.js 14 website has been generated in: `/Users/marco/Local Sites/mimic`

## 📋 Next Steps

### 1. Install Dependencies

Open your terminal and run:

```bash
cd "/Users/marco/Local Sites/mimic"
npm install
```

This will install all required packages:
- Next.js 14
- React 18
- Tailwind CSS
- Framer Motion
- Lucide React
- TypeScript

**Installation time**: ~2-3 minutes

### 2. Start Development Server

Once installation is complete:

```bash
npm run dev
```

The website will be available at: **http://localhost:3000**

### 3. Open in New Cursor Window

To work on this project in Cursor:
1. Open Cursor
2. File → Open Folder
3. Navigate to `/Users/marco/Local Sites/mimic`
4. Click "Open"

## 🎨 What's Included

### ✅ Complete Pages
- **Homepage** (`/`) - Hero, research overview, latest news
- **Team** (`/team`) - PI section + research team grid
- **Research** (`/research`) - Projects, keywords, facilities
- **Publications** (`/publications`) - Filterable publication list
- **Collaborations** (`/collaborations`) - Academic & industry partners
- **News** (`/news`) - News, events, conferences, awards
- **Join Us** (`/join`) - Career opportunities
- **Contact** (`/contact`) - Contact form + map

### ✅ Components
- Navbar (sticky, responsive, mobile menu)
- Footer (multi-column, social links)
- Hero (animated, with stats)
- Team Card (with modal for full bio)
- Publication Card (with DOI links)
- News Card (with tags)
- Research Card (hover effects)
- Grid Background (subtle, non-intrusive)

### ✅ Data Files (JSON)
- `data/team.json` - Team members (8 people)
- `data/publications.json` - Publications (15 papers)
- `data/research.json` - Research projects (9 projects)
- `data/news.json` - News items (12 items)
- `data/collaborations.json` - Partners & projects

### ✅ Styling
- **100% PoliMi Brand Identity** compliant
- Tailwind CSS configured
- Custom color palette
- Google Fonts (Manrope + Frank Ruhl Libre)
- Responsive design (mobile-first)
- Smooth animations (Framer Motion)

## 🖼️ Adding Images

### Required Image Directories

The following structure is ready for your images:

```
public/images/
├── team/              # Team member photos (400x400px square)
├── research/          # Research images (1200x675px, 16:9)
├── news/              # News images (1200x675px, 16:9)
└── partners/          # Partner logos (SVG or PNG)
```

### Placeholder Images

For testing, you can:
1. Use placeholder services like `https://placehold.co/400x400`
2. Update image paths in JSON files
3. Or add your own images to `public/images/`

Example in `data/team.json`:
```json
"image": "/images/team/marco-rossi.jpg"
```

## 🔧 Customization Guide

### Update Content

Edit JSON files in `data/` folder:
- **Team members**: `data/team.json`
- **Publications**: `data/publications.json`
- **Research projects**: `data/research.json`
- **News items**: `data/news.json`
- **Collaborations**: `data/collaborations.json`

### Modify Colors (if needed)

Edit `tailwind.config.ts`:
```typescript
colors: {
  polimi: {
    'blue-heritage': '#102C53',  // Primary color
    'bright-blue': '#4DC9FF',    // Accent
    // ... other colors
  }
}
```

### Change Fonts

Edit `app/layout.tsx` - Google Fonts import section.

## 📱 Testing Checklist

Once running, test:
- [ ] Homepage loads correctly
- [ ] Navigation works (all pages accessible)
- [ ] Mobile menu works (click hamburger icon)
- [ ] Responsive design (resize browser)
- [ ] Team cards show member info
- [ ] Publications filter works
- [ ] News tags filter correctly
- [ ] Forms display properly
- [ ] Footer links work

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. Create account at [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import Git repository
4. Deploy automatically

**Custom Domain**: Configure in Vercel dashboard

### Option 2: Netlify

1. Build: `npm run build`
2. Drag `.next` folder to Netlify
3. Done!

### Option 3: Traditional Hosting

Generate static export:
1. Add to `next.config.js`: `output: 'export'`
2. Run: `npm run build`
3. Upload `out/` folder to any hosting

## ⚠️ Important Notes

### 1. Images are Placeholders
All image paths point to `/images/...` but files don't exist yet.
**Action needed**: Add actual images or the browser will show broken image icons.

### 2. Contact Form
The contact form UI is complete but doesn't send emails yet.
**Next step**: Integrate with service like:
- Formspree
- EmailJS
- Custom API route

### 3. Google Maps API
The map embed uses a generic URL.
**Action needed**: Get Google Maps API key and update iframe src in `app/contact/page.tsx`.

### 4. Social Links
Footer social links point to `#`.
**Action needed**: Add actual URLs in `components/Footer.tsx`.

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
npm run dev -- -p 3001
```

### Can't find module errors?
```bash
rm -rf node_modules package-lock.json
npm install
```

### White screen / crashes?
Check browser console (F12) for errors. Often a JSON syntax issue.

### Styles not loading?
```bash
npm run dev
# Wait for "compiled successfully"
# Hard refresh browser (Cmd+Shift+R on Mac)
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Politecnico di Milano Brand Guidelines](https://www.polimi.it/en/the-politecnico/branding/)

## 💡 Tips

1. **VS Code Extensions** (if using):
   - Tailwind CSS IntelliSense
   - ES7+ React Snippets
   - Prettier

2. **Chrome DevTools**:
   - Press F12 to inspect elements
   - Use mobile view simulator (top-left icon)

3. **Hot Reload**:
   - Changes auto-refresh in browser
   - No need to restart server

## 📞 Need Help?

If you encounter issues:
1. Check the browser console (F12) for errors
2. Check terminal for build errors
3. Verify Node.js version: `node -v` (should be 18+)

---

**🎉 Your website is ready to go! Just run `npm install` then `npm run dev`**

Happy coding! 🚀
