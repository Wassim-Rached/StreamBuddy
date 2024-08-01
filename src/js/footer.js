const footer = document.getElementById("footer");

if (footer) {
  const footerTemplate = `
<footer class="bg-light text-center text-lg-start border-top mt-4">
      <div class="container p-4">
        <!-- Credits Section -->
        <div class="row">
          <div class="col-lg-6 col-md-12">
            <p class="text-muted mb-0">© 2024 Wassim Rached</p>
          </div>
          <!-- Links Section -->
          <div class="col-lg-6 col-md-12 text-lg-end">
            <a
              href="https://github.com/wassim-rached"
              class="btn btn-outline-dark btn-sm ms-2"
              target="_blank"
              title="GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-github"
                viewBox="0 0 16 16"
              >
                <path
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.54 5.44 7.6.4.074.556-.174.556-.388v-1.36c-2.21.485-2.68-1.05-2.68-1.05-.36-.915-.88-1.16-.88-1.16-.72-.495.055-.485.055-.485.797.056 1.28.82 1.28.82.708 1.2 1.855.854 2.31.654.06-.514.277-.854.503-1.051-1.772-.203-3.632-.886-3.632-3.947 0-.873.31-1.585.82-2.147-.084-.203-.356-1.027.074-2.13 0 0 .672-.215 2.2.82.64-.178 1.328-.268 2.01-.271.682.003 1.37.093 2.01.271 1.52-1.034 2.19-.82 2.19-.82.432 1.102.159 1.926.078 2.13.51.562.82 1.274.82 2.147 0 3.06-1.87 3.74-3.64 3.94.284.245.54.727.54 1.463v2.18c0 .214.148.464.558.388C13.71 14.54 16 11.54 16 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/wassim-rached-407994239"
              class="btn btn-outline-dark btn-sm ms-2"
              target="_blank"
              title="LinkedIn"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-linkedin"
                viewBox="0 0 448 512"
              >
                <path
                  d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
`;

  footer.innerHTML = footerTemplate;
}
