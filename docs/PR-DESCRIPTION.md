# UX Improvements: Drag-Drop, Copy Buttons, Dark Mode, Animations

## Summary

This PR implements all the UX improvements from the refactor opportunities document:

- Touch-optimized drag and drop using `@dnd-kit`
- Copy-to-clipboard buttons for secrets and URLs
- Dark mode with system preference detection
- Animations and loading skeletons

## Screenshots

### Dark Mode Toggle

| Light Mode | Dark Mode |
|------------|-----------|
| ![Light Mode](docs/images/light-mode.png) | ![Dark Mode](docs/images/dark-mode.png) |

### Copy Buttons

![Copy buttons for secret and URLs](docs/images/copy-buttons.png)

### Drag and Drop

![Drag and drop ranking](docs/images/drag-drop.gif)

### Loading Skeletons

![Loading skeleton animation](docs/images/loading-skeleton.gif)

## Test Plan

- [ ] Create a new vote and verify copy buttons work for secret and URLs
- [ ] Submit a ballot using drag-and-drop on desktop
- [ ] Submit a ballot using drag-and-drop on mobile/touch device
- [ ] Toggle between light/dark/system themes
- [ ] Verify theme persists after page refresh
- [ ] Check loading skeletons appear when navigating to vote/results pages
- [ ] Verify all animations are smooth and not jarring

## How to Capture Screenshots

To add the screenshots, run the dev server and capture:

```bash
npm run dev  # Server runs on http://localhost:3100
```

**Recommended screenshots:**
1. `light-mode.png` - Home page in light mode
2. `dark-mode.png` - Home page in dark mode
3. `copy-buttons.png` - Vote created page showing copy buttons
4. `drag-drop.gif` - Animated GIF of dragging to reorder options
5. `loading-skeleton.gif` - Animated GIF of loading skeleton on results page

Tools for capturing:
- macOS: Cmd+Shift+4 for screenshots, or use [Kap](https://getkap.co/) for GIFs
- Windows: Win+Shift+S for screenshots, or use [ScreenToGif](https://www.screentogif.com/)
- Linux: `gnome-screenshot` or [Peek](https://github.com/phw/peek) for GIFs
- Browser: Chrome DevTools > More tools > Animations for slow-motion capture
