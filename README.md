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
```

<img width="1852" height="927" alt="0000000007" src="https://github.com/user-attachments/assets/0819280d-e99f-4160-859e-dbfc36f8340f" />

<img width="1852" height="927" alt="0000000006" src="https://github.com/user-attachments/assets/318296a6-a7f5-43e7-b6b1-4e858956318b" />

<img width="1852" height="927" alt="0000000002" src="https://github.com/user-attachments/assets/a3de1a0b-41d4-4325-b13a-0b07bf224555" />

<img width="1852" height="927" alt="0000000003" src="https://github.com/user-attachments/assets/16a059d5-d024-4234-a88d-32927eb913ee" />

<img width="1852" height="927" alt="0000000001" src="https://github.com/user-attachments/assets/f615b8af-66f4-48ab-8592-0578b5e8355d" />

<img width="1852" height="927" alt="0000000005" src="https://github.com/user-attachments/assets/9174d89b-0037-4b26-a6a9-8601830093de" />

<img width="1852" height="927" alt="0000000004" src="https://github.com/user-attachments/assets/e58fcbb9-e513-4a5b-bb16-635bbaa2ecfb" />





