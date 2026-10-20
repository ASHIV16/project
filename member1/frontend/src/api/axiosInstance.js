import axios from "axios";

const SERVICE_URLS = {
  member1: "http://localhost:5000/api", // Auth & Beneficiaries
  member2: "http://localhost:5001/api", // Documents & Verification
  member3: "http://localhost:5002/api", // Correction Requests & Workflow
  member4: "http://localhost:5003/api", // Admin Analytics & Audit Logs
};

const api = axios.create({
  baseURL: SERVICE_URLS.member1,
  headers: { "Content-Type": "application/json" },
});

// Dynamic routing based on request path & attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gramin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const url = config.url || "";
  if (url.startsWith("/admin")) {
    config.baseURL = SERVICE_URLS.member4;
  } else if (url.includes("/documents") || url.includes("/verification")) {
    config.baseURL = SERVICE_URLS.member2;
  } else if (url.startsWith("/reviewer") || url.startsWith("/requests")) {
    config.baseURL = SERVICE_URLS.member3;
  } else {
    config.baseURL = SERVICE_URLS.member1;
  }

  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("gramin_token");
      localStorage.removeItem("gramin_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
