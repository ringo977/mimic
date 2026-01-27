# Organ-on-Chip Lab Website - Politecnico di Milano

A modern, professional Next.js 14 website for the Organ-on-Chip research laboratory at the Department of Electronics, Information and Bioengineering (DEIB), Politecnico di Milano.

## 🎨 Design System

This website strictly follows the **Politecnico di Milano Brand Identity**:

### Colors
- **Primary**: `#102C53` (PoliMi Blue Heritage)
- **Accent**: `#4DC9FF` (Bright Blue), `#2CB7FF` (Alpha Blue)
- **Supporting**: Binary Cyan, Space Blue, Photonic Azure

### Typography
- **Headings**: Frank Ruhl Libre (serif)
- **Body**: Manrope (sans-serif)

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## 📁 Project Structure

```
mimic/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with fonts
│   ├── page.tsx           # Homepage
│   ├── team/              # Team page
│   ├── research/          # Research projects
│   ├── publications/      # Publications list
│   ├── collaborations/    # Partners & collaborations
│   ├── news/              # News & events
│   ├── join/              # Career opportunities
│   └── contact/           # Contact information
├── components/            # React components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── TeamCard.tsx
│   ├── PublicationCard.tsx
│   ├── NewsCard.tsx
│   ├── ResearchCard.tsx
│   ├── GridBackground.tsx
│   └── ui/               # Reusable UI components
├── data/                 # JSON data files
│   ├── team.json
│   ├── publications.json
│   ├── research.json
│   ├── news.json
│   └── collaborations.json
├── public/               # Static assets
│   └── images/          # Images (to be added)
└── styles/
    └── globals.css      # Global styles
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm

### Installation Steps

1. **Navigate to project directory**:
   ```bash
   cd "/Users/marco/Local Sites/mimic"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🖼️ Adding Images

Create these directories and add your images:

```
public/
└── images/
    ├── team/              # Team member photos
    │   ├── marco-rossi.jpg
    │   ├── maria-bianchi.jpg
    │   └── ...
    ├── research/          # Research project images
    │   ├── cardiac.jpg
    │   ├── liver.jpg
    │   └── ...
    ├── news/              # News images
    │   ├── publication.jpg
    │   └── ...
    └── partners/          # Partner logos
        ├── mit.png
        ├── eth.png
        └── ...
```

**Image Requirements**:
- Team photos: 400x400px (square)
- Research images: 1200x675px (16:9 ratio)
- News images: 1200x675px (16:9 ratio)
- Partner logos: SVG or PNG with transparent background

## 📊 Updating Content

### Team Members
Edit `data/team.json` to add/modify team members.

### Publications
Edit `data/publications.json` to add new publications.

### Research Projects
Edit `data/research.json` to update research areas.

### News & Events
Edit `data/news.json` to post news items.

### Collaborations
Edit `data/collaborations.json` to update partners.

## 🎨 Customization

### Colors
Modify `tailwind.config.ts` to adjust the color palette (follow PoliMi brand guidelines).

### Fonts
Fonts are loaded in `app/layout.tsx` via Google Fonts.

### Grid Background
Adjust opacity in `components/GridBackground.tsx` (default: 8%).

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Deploy to Netlify

1. Build: `npm run build`
2. Publish directory: `.next`
3. Deploy

### Static Export (Optional)

For static hosting, add to `next.config.js`:
```javascript
output: 'export',
```
Then run: `npm run build`

## 📱 Responsive Design

The website is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Semantic HTML
- Keyboard navigation support
- Screen reader optimized
- Alt text for images (to be added)

## 🔍 SEO

- Dynamic metadata per page
- Open Graph tags
- Semantic HTML structure
- Sitemap (to be generated)

## 📄 License

© 2024 Organ-on-Chip Lab, Politecnico di Milano. All rights reserved.

## 🤝 Contributing

This is a research lab website. For content updates, contact: info@organchip.polimi.it

## 📞 Support

For technical issues or questions:
- Email: webmaster@organchip.polimi.it
- Issues: Create a GitHub issue

---

Built with ❤️ for research excellence at Politecnico di Milano
