export function setHighlightJsTheme(theme) {
    const highlightJsTheme = theme === 'dark' ? 'dark' : 'default'; // Set highlight.js theme based on VSCode theme
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/${highlightJsTheme}.min.css`;
    document.head.appendChild(linkElement);
}
