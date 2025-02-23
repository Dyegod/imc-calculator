// Configuração inicial
const form = document.getElementById("formulario");
let historicoIMC = JSON.parse(localStorage.getItem("historicoIMC")) || [];
let imcChart = null;

const ERROR_MESSAGES = {
  emptyInput: "Preencha todos os campos.",
  invalidInput: "Use números válidos.",
  negativeInput: "Valores não podem ser zero ou negativos.",
  minWeight: "Peso mín: 2 kg.",
  minHeight: "Altura mín: 0.2 m.",
  maxWeight: "Peso máx: 500 kg.",
  maxHeight: "Altura máx: 3 m.",
  minAge: "Idade mín: 1 ano.",
  maxAge: "Idade máx: 120 anos.",
};

// Função de debounce para otimização
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Validação em tempo real
const inputs = document.querySelectorAll("input[type='number']");
const validateInput = debounce((input) => {
  const value = parseFloat(input.value);
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  input.classList.remove("valid", "invalid");
  if (input.value && !isNaN(value) && value >= min && value <= max) {
    input.classList.add("valid");
  } else if (input.value) {
    input.classList.add("invalid");
  }
}, 300);

inputs.forEach((input) =>
  input.addEventListener("input", () => validateInput(input))
);

// Manipula envio do formulário
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.classList.add("loading");

    try {
      const peso = parseFloat(document.getElementById("peso").value);
      const altura = parseFloat(document.getElementById("altura").value);
      const idade = parseFloat(document.getElementById("idade").value);
      const sexo = document.getElementById("sexo").value;
      const atividade = parseFloat(document.getElementById("atividade").value);

      validateInputs(peso, altura, idade);

      const imc = calculateIMC(peso, altura);
      const { faixa, dicas } = calcularFaixaImc(imc);
      const pesoIdeal = calculateIdealWeight(altura);
      const calorias = calculateDailyCalories(
        peso,
        altura,
        idade,
        sexo,
        atividade
      );
      const caloriasAjuste = calculateCalorieAdjustment(calorias);

      displayResult(imc, faixa);
      displayIdealWeight(pesoIdeal);
      displayDailyCalories(calorias, caloriasAjuste);
      displayTips(dicas);
      addToHistory(imc, faixa);
      updateChart();

      showToast("Cálculo concluído!");
      form.reset();
      inputs.forEach((input) => input.classList.remove("valid", "invalid"));
    } catch (error) {
      displayError(error.message);
      showToast("Erro nos dados!", true);
    } finally {
      setTimeout(() => submitButton.classList.remove("loading"), 500);
    }
  });
}

// Funções principais
function validateInputs(peso, altura, idade) {
  if (!peso || !altura || !idade) throw new Error(ERROR_MESSAGES.emptyInput);
  if (isNaN(peso) || isNaN(altura) || isNaN(idade))
    throw new Error(ERROR_MESSAGES.invalidInput);
  if (peso <= 0 || altura <= 0 || idade <= 0)
    throw new Error(ERROR_MESSAGES.negativeInput);
  if (peso < 2) throw new Error(ERROR_MESSAGES.minWeight);
  if (altura < 0.2) throw new Error(ERROR_MESSAGES.minHeight);
  if (peso > 500) throw new Error(ERROR_MESSAGES.maxWeight);
  if (altura > 3) throw new Error(ERROR_MESSAGES.maxHeight);
  if (idade < 1) throw new Error(ERROR_MESSAGES.minAge);
  if (idade > 120) throw new Error(ERROR_MESSAGES.maxAge);
}

function calculateIMC(peso, altura) {
  return peso / (altura * altura);
}

function calculateIdealWeight(altura) {
  const imcMin = 18.5;
  const imcMax = 24.9;
  return { min: imcMin * altura * altura, max: imcMax * altura * altura };
}

function calculateDailyCalories(peso, altura, idade, sexo, atividade) {
  const alturaCm = altura * 100;
  const tmb =
    sexo === "masculino"
      ? 10 * peso + 6.25 * alturaCm - 5 * idade + 5
      : 10 * peso + 6.25 * alturaCm - 5 * idade - 161;
  return Math.round(tmb * atividade);
}

function calculateCalorieAdjustment(calorias) {
  const deficit = 500;
  return {
    manter: calorias,
    perder: Math.round(calorias - deficit),
    ganhar: Math.round(calorias + deficit),
  };
}

function calcularFaixaImc(imc) {
  const faixas = [
    {
      max: 18.5,
      faixa: "Abaixo do peso",
      dicas: "Aumente calorias saudáveis.",
      color: "#ecc94b",
    },
    {
      max: 25,
      faixa: "Peso saudável",
      dicas: "Mantenha dieta equilibrada.",
      color: "#48bb78",
    },
    {
      max: 30,
      faixa: "Sobrepeso",
      dicas: "Reduza calorias, aumente atividade.",
      color: "#ed8936",
    },
    {
      max: Infinity,
      faixa: "Obesidade",
      dicas: "Consulte um profissional.",
      color: "#e53e3e",
    },
  ];
  return faixas.find((f) => imc < f.max);
}

function displayResult(imc, faixa) {
  document.getElementById("imc").textContent = `IMC: ${imc.toFixed(2)}`;
  document.getElementById("faixa-imc").textContent = faixa;
}

function displayIdealWeight(pesoIdeal) {
  document.getElementById(
    "peso-ideal"
  ).textContent = `Peso ideal: ${pesoIdeal.min.toFixed(
    1
  )} a ${pesoIdeal.max.toFixed(1)} kg`;
}

function displayDailyCalories(calorias, caloriasAjuste) {
  document.getElementById(
    "calorias"
  ).textContent = `Manter: ${caloriasAjuste.manter} kcal`;
  document.getElementById(
    "calorias-ajuste"
  ).textContent = `Perder: ${caloriasAjuste.perder} kcal | Ganhar: ${caloriasAjuste.ganhar} kcal`;
}

function displayTips(dicas) {
  document.getElementById("dicas").textContent = dicas;
}

function addToHistory(imc, faixa) {
  historicoIMC.push({
    imc: imc.toFixed(2),
    faixa,
    date: new Date().toLocaleDateString("pt-BR"),
  });
  if (historicoIMC.length > 5) historicoIMC.shift();
  localStorage.setItem("historicoIMC", JSON.stringify(historicoIMC));
  const listaHistorico = document.getElementById("historico-lista");
  listaHistorico.innerHTML = historicoIMC
    .map(
      (entry, index) =>
        `<li data-index="${index}" class="history-item"><strong>IMC:</strong> ${entry.imc} - <strong>Faixa:</strong> ${entry.faixa} - <em>${entry.date}</em></li>`
    )
    .join("");
  document.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () =>
      document
        .querySelector(".resultado-section")
        .scrollIntoView({ behavior: "smooth" })
    );
  });
}

function displayError(message) {
  document.querySelector(
    ".resultado-section"
  ).innerHTML = `<p class="error-message">${message}</p>`;
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${isError ? "error" : "success"}`;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 3000);
}

function updateChart() {
  const canvas = document.getElementById("grafico-imc");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (imcChart) imcChart.destroy();

  const labels = historicoIMC.map((entry) => entry.date);
  const data = historicoIMC.map((entry) => parseFloat(entry.imc));

  imcChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["Sem dados"],
      datasets: [
        {
          label: "Progresso IMC",
          data: data.length ? data : [0],
          borderColor: "#68d391",
          backgroundColor: "rgba(104,211,145,0.2)",
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#68d391",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          suggestedMin: 15,
          suggestedMax: 40,
          title: { display: true, text: "IMC" },
        },
        x: { title: { display: true, text: "Data" } },
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { callbacks: { label: (e) => `IMC: ${e.raw.toFixed(2)}` } },
      },
    },
  });
}

// Evento de limpar histórico
const clearHistoryBtn = document.getElementById("clear-history");
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    historicoIMC = [];
    localStorage.setItem("historicoIMC", JSON.stringify(historicoIMC));
    const listaHistorico = document.getElementById("historico-lista");
    listaHistorico.classList.add("fade-out");
    setTimeout(() => {
      listaHistorico.innerHTML = "";
      listaHistorico.classList.remove("fade-out");
      updateChart();
      showToast("Histórico limpo!");
    }, 300);
  });
}

// Partículas otimizadas
document.addEventListener("DOMContentLoaded", () => {
  const particlesCanvas = document.getElementById("particles-canvas");
  const particlesCtx = particlesCanvas.getContext("2d");
  let particlesArray = [];
  const mouse = { x: null, y: null, radius: 50 };

  function resizeCanvas() {
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
    initParticles();
  }

  function initParticles() {
    particlesArray = [];
    const numberOfParticles = Math.min(
      (particlesCanvas.width * particlesCanvas.height) / 20000,
      50
    );
    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(
        new Particle(
          Math.random() * particlesCanvas.width,
          Math.random() * particlesCanvas.height
        )
      );
    }
  }

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 2 + 1;
      this.speedX = Math.random() * 1 - 0.5;
      this.speedY = Math.random() * 1 - 0.5;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.size > 0.2) this.size -= 0.05;

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        this.x -= (dx / distance) * force;
        this.y -= (dy / distance) * force;
      }

      if (this.x < 0 || this.x > particlesCanvas.width)
        this.speedX = -this.speedX;
      if (this.y < 0 || this.y > particlesCanvas.height)
        this.speedY = -this.speedY;
    }

    draw() {
      particlesCtx.fillStyle = `rgba(104, 211, 145, ${this.size / 5})`;
      particlesCtx.beginPath();
      particlesCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      particlesCtx.fill();
    }
  }

  function animateParticles() {
    particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
      const particle = particlesArray[i];
      particle.update();
      particle.draw();
      if (particle.size <= 0.2) {
        particlesArray[i] = new Particle(
          Math.random() * particlesCanvas.width,
          Math.random() * particlesCanvas.height
        );
      }
    }
    requestAnimationFrame(animateParticles);
  }

  const debounceResize = debounce(resizeCanvas, 100);
  window.addEventListener("resize", debounceResize);
  window.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
    },
    { passive: true }
  );

  resizeCanvas();
  requestAnimationFrame(animateParticles);

  if (document.getElementById("grafico-imc")) updateChart();
});

document.addEventListener("DOMContentLoaded", () => {
  // ... (código existente das partículas)

  // Inicializa gráfico vazio imediatamente
  updateChart();

  // Restante do código
});
