# LooFinder — Melbourne

A beautiful, Australian-themed toilet finder web application for Melbourne. Built with modern web technologies and featuring real-time OpenStreetMap data integration.

## 🌟 Features

- **🗺️ Interactive Map** - Powered by Leaflet with CartoDB Voyager tiles
- **🚻 Real Toilet Data** - Live data from OpenStreetMap Overpass API
- **🎨 Aussie Theme** - Warm Australian colors (eucalypt, wattle, sand)
- **🔍 Smart Search** - Search by location or suburb name
- **🏷️ Filter System** - Filter by wheelchair access, baby change, and free access
- **📍 Location Services** - Find toilets near your current location
- **⭐ Review System** - Rate and review toilet facilities
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🎨 Design Philosophy

LooFinder embraces Australian identity through its design:

- **Eucalypt Green** (#3d6b4f) - Primary actions and accents
- **Wattle Gold** (#d4a017) - Brand highlights and ratings
- **Sand** (#f5f0e8) - Warm background tones
- **Bark** (#2c1f0e) - Dark headers and text
- **Cream** (#faf7f2) - Clean sidebar backgrounds

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for development)

### Installation

1. **Clone or download** the project files
2. **Open `index.html`** in your web browser
3. **Allow location access** when prompted for best experience

### Development Setup

For local development with a web server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## 📁 Project Structure

```
LooFinder/
├── index.html          # Main HTML file with Aussie theme
├── app.js              # Main application logic
├── data-loader.js      # OpenStreetMap data integration
└── README.md           # This file
```

## 🔧 Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js with CartoDB Voyager tiles
- **Styling**: Custom CSS with CSS Variables
- **Typography**: Bricolage Grotesque & DM Sans (Google Fonts)
- **Icons**: Font Awesome 6
- **Data**: OpenStreetMap Overpass API

## 📊 Data Sources

### Primary: OpenStreetMap
- Real-time user-contributed data
- Melbourne metropolitan area coverage
- Includes facility details (wheelchair access, baby change, etc.)

### Fallback: Sample Data
- 5 major Melbourne locations
- Ensures app functionality even when API is unavailable

## 🎯 Key Features

### Map Interaction
- **Click markers** to view toilet details
- **Pan/zoom** to explore different areas
- **Auto-update** toilet list when map moves

### Smart Filtering
- **Wheelchair Accessible** - ♿ icon
- **Baby Change** - 👶 icon  
- **Free Access** - 🆓 icon
- **Visual filter chips** with active states

### Search System
- **Real-time search** as you type
- **Search by name** or address
- **Instant results** with map highlighting

### Review System
- **5-star rating** with visual feedback
- **Optional comments** for detailed feedback
- **Persistent storage** using localStorage
- **GitHub integration** for review backup

## 🌍 Geographic Coverage

**Primary Coverage**: Melbourne Metropolitan Area
- **Bounds**: -38.0 to -37.7 latitude, 144.8 to 145.0 longitude
- **Includes**: CBD, inner suburbs, and major facilities

## 🔄 Data Flow

1. **App loads** → Initializes map and UI
2. **Fetches data** → OpenStreetMap API (or sample data)
3. **Displays markers** → Shows toilets on map
4. **Updates sidebar** → Lists nearby toilets
5. **User interacts** → Search, filter, or review

## 🎨 UI Components

### Header
- **Logo**: "LooFinder" with wattle gold accent
- **Search bar**: Integrated with real-time results
- **Location button**: Find user's current position

### Sidebar
- **Results counter**: Shows number of toilets found
- **Filter chips**: Visual pill buttons for facilities
- **Toilet cards**: Clean cards with distance and tags

### Map
- **CartoDB Voyager**: Google Maps-like styling
- **Toilet markers**: Custom icons with popup details
- **User location**: Green dot when location is enabled

## 📱 Responsive Design

- **Desktop**: Full sidebar with map
- **Tablet**: Optimized sidebar width
- **Mobile**: Collapsible sidebar (future enhancement)

## 🔧 Customization

### Colors
Edit CSS variables in `index.html`:

```css
:root {
    --eucalypt: #3d6b4f;     /* Primary actions */
    --wattle: #d4a017;       /* Highlights */
    --sand: #f5f0e8;         /* Background */
    --bark: #2c1f0e;         /* Text/headers */
}
```

### Geographic Bounds
Edit bounds in `data-loader.js`:

```javascript
const melbourneBounds = {
    south: -38.0,    // Southern boundary
    north: -37.7,    // Northern boundary  
    west: 144.8,     // Western boundary
    east: 145.0      // Eastern boundary
};
```

## 🐛 Troubleshooting

### Map Not Showing
- Check browser console for errors
- Ensure internet connection for tile loading
- Try refreshing the page

### No Toilet Data
- OpenStreetMap API might be temporarily unavailable
- App will fall back to sample data automatically
- Check console for API error messages

### Location Not Working
- Ensure location permissions are granted
- Check if HTTPS is used (required for geolocation)
- Try manual location search instead

## 🚀 Future Enhancements

- **Mobile app** version
- **Offline caching** for better performance
- **Additional data sources** (government APIs)
- **User accounts** for saved preferences
- **Photo uploads** for toilet facilities
- **Opening hours** integration
- **Accessibility scoring** system

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests or open issues for:
- Bug reports
- Feature suggestions  
- Code improvements
- Documentation updates

## 📞 Support

For questions or support:
- Create an issue in the project repository
- Check the troubleshooting section above
- Review browser console for error messages

---

**LooFinder** — Making Melbourne more accessible, one toilet at a time! 🚻✨
