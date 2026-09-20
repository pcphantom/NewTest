/* A classic script can explain file:// startup before module loading is attempted. */
(() => {
    const status = document.getElementById("startup-status");
    const heading = document.getElementById("startup-heading");

    if (window.location.protocol === "file:") {
        heading.textContent = "Open the game through a web server";
        status.textContent = "You opened index.html directly. The game cannot load its JavaScript modules this way. Use the local game link below once your server is running.";
        return;
    }

    status.textContent = "Loading the game...";
    const script = document.createElement("script");
    script.type = "module";
    const startup_url = new URL(document.currentScript.src);
    const bootstrap_url = new URL("./GameBootstrap.js", startup_url);
    bootstrap_url.search = startup_url.search;
    script.src = bootstrap_url.href;

    const stop_startup_listeners = () => {
        window.removeEventListener("error", show_startup_error);
    };
    const show_startup_error = () => {
        // Once the game replaces this screen, its own error handling takes over.
        if (status.isConnected) {
            heading.textContent = "The game could not start";
            status.textContent = "A game file failed to load or initialize. Check that the full project is being served, then reload the page. Developer tools may show which file failed.";
        }
        stop_startup_listeners();
    };

    window.addEventListener("error", show_startup_error);
    script.addEventListener("error", show_startup_error, { once: true });
    script.addEventListener("load", stop_startup_listeners, { once: true });
    document.head.append(script);
})();
