const form = document.getElementById("shorten-form");
const input = document.getElementById("url");
const submit = document.getElementById("submit");
const result = document.getElementById("result");
const shortUrlEl = document.getElementById("short-url");
const errorEl = document.getElementById("error");
const copyBtn = document.getElementById("copy");

function showError(msg) {
  result.classList.remove("show");
  errorEl.textContent = msg;
  errorEl.classList.add("show");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.remove("show");
  result.classList.remove("show");

  let raw = input.value.trim();
  if (!raw) {
    showError("Paste a URL first.");
    return;
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = "https://" + raw;
    input.value = raw;
  }

  submit.disabled = true;
  try {
    const res = await fetch("/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_url: raw }),
    });
    if (!res.ok) {
      showError("Could not shorten that. Check the URL and try again.");
      return;
    }
    const data = await res.json();
    const shortLink = window.location.origin + "/expand/" + data.id;
    shortUrlEl.textContent = shortLink;
    result.classList.add("show");
  } catch {
    showError("Network error. Is the service up?");
  } finally {
    submit.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortUrlEl.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1500);
  } catch {
    window.prompt("Copy this link:", text);
  }
});
