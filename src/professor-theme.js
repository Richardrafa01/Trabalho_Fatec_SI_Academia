const theme = localStorage.getItem("professor-theme") ?? "light";

document.body.classList.toggle("professor-theme-black", theme === "black");
document.body.classList.toggle("professor-theme-light", theme !== "black");
