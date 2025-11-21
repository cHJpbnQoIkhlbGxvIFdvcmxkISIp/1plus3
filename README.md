# 1plus3: Thumbnail + 3 Extra Frames (for YouTube)

This extension helps you avoid misleading clickbait YouTube thumbnails. 1+3 keeps the main thumbnail and adds three small static frames from the video's start, middle, and end. See what the video really shows and decide if you like it.

This allows you to verify the actual content of the video at a glance before clicking.

## 🚀 Features

* **3 Extra Frames:** Displays thumbnails from `0%`, `50%`, and `100%` of the video (configurable).
* **Seamless Integration:** Works on the Homepage, Search Results, Channel Pages, and Sidebar.
* **Hover Effects:** Optional zoom-on-hover for better visibility.
* **Lazy Loading:** Images load only when needed to save bandwidth.
* **Highly Configurable:** Customize size, position, quality, and behavior via the internal `CONFIG` object.

## 📥 Installation

1.  **Install a UserScript Manager:**
    * [Tampermonkey](https://www.tampermonkey.net/) (Recommended for Chrome, Edge, Safari, Firefox)
    * [Violentmonkey](https://violentmonkey.github.io/) (Open Source alternative)

2.  **Install the Script:**
    * Create a new script in your manager.
    * Copy the content of `1plus3.js` from this repository.
    * Paste it into the editor and save.

3.  **Refresh YouTube:** Go to YouTube.com, and you should see the extra frames appear under the video titles.

## ⚙️ Configuration

You can customize the script behavior by editing the `CONFIG` object at the top of the script file:

```javascript
const CONFIG = {
    thumbnails: {
        quality: 'hq',       // 'hq', 'mq', 'sd', or 'maxres'
        hoverEffect: true,   // Enable/Disable zoom on hover
        showOnHover: false,  // Set to true to hide frames until you hover over the video
        // ... other settings
    },
    // ...
};
