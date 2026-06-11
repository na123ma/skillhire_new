const loginForm =
document.getElementById(
"loginForm"
);
const statusMessage = document.getElementById("statusMessage");

function showStatus(message, isError = false) {
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#dc2626" : "#15803d";
  }
}

loginForm.addEventListener(
"submit",
async (e)=>{

e.preventDefault();

const email =
document.getElementById(
"email"
).value;

const password =
document.getElementById(
"password"
).value;

showStatus("Signing in…", false);

try {
const response =
await fetch(
"http://localhost:5080/api/auth/login",
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:
JSON.stringify({
email,
password
})
}
);

const data =
await response.json();

if(response.ok){

localStorage.setItem(
"token",
data.token
);

localStorage.setItem(
"role",
data.role
);

window.location.href =
"dashboard.html";

  showStatus("Login successful. Redirecting…", false);
}
else{
  showStatus(data.message || "Unable to login. Please try again.", true);
}
} catch (error) {
  console.error("Login failed:", error);
  showStatus("Unable to connect to the server. Please try again.", true);
}

});