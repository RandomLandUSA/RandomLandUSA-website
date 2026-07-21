import { supabase } from "./supabase-client.js";

const form = document.getElementById("login-form");
const message = document.getElementById("login-message");

// If already logged in, go straight to the dashboard
const { data } = await supabase.auth.getSession();

if (data.session) {
  window.location.href = "dashboard.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "Signing in...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  window.location.href = "dashboard.html";
});