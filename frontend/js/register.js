const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  const statusMessage = document.getElementById("statusMessage");

  function showStatus(message, isError = false) {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.style.color = isError ? "#dc2626" : "#15803d";
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showStatus("Enter a valid email address.", true);
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!passwordRegex.test(password)) {
    showStatus("Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.", true);
    return;
  }

  if (password !== confirmPassword) {
    showStatus("Passwords do not match.", true);
    return;
  }

const payload = {

username:
document.getElementById(
"username"
).value,

email,

rollNo:
document.getElementById(
"rollNo"
).value,

collegeName:
document.getElementById(
"collegeName"
).value,

phoneNumber:
document.getElementById(
"phoneNumber"
).value,

passedYear:
document.getElementById(
"passedYear"
).value,

batchNo:
document.getElementById(
"batchNo"
).value,

branch:
document.getElementById(
"branch"
).value,

password

};

showStatus("Creating your account…", false);

try {
  const response =
  await fetch(
  "http://localhost:5080/api/auth/register",
  {
  method:"POST",

  headers:{
  "Content-Type":
  "application/json"
  },

  body:
  JSON.stringify(payload)
  }
  );

  const data =
  await response.json();

  if(response.ok){
    showStatus(data.message || "Registration successful. Redirecting to login…", false);
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  }
  else{
    showStatus(data.message || "Unable to register. Please try again.", true);
  }
} catch (error) {
  console.error("Registration failed:", error);
  showStatus("Unable to connect to the server. Please try again.", true);
}

});