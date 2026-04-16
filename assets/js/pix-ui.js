/**
 * PIX payment manager for the QR page.
 */
class PixUIManager {
  constructor() {
    this.config = {
      createUrl: "/api/pix/create",
      statusUrl: "/api/pix/status/",
      pollInterval: 5000,
      successRedirect: "success.html",
    };
    this.state = null;
    this.transaction = null;
    this.statusInterval = null;
    this.isChecking = false;
  }

  toCents(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return 0;
      if (Number.isInteger(value) && Math.abs(value) >= 1000) return value;
      return Math.round(value * 100);
    }
    const text = String(value).trim();
    if (!text) return 0;
    if (/^-?\d+$/.test(text)) {
      const numeric = Number(text);
      if (Math.abs(numeric) >= 1000) return numeric;
      return Math.round(numeric * 100);
    }
    const normalized = text
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }

  extractPixCode(transaction) {
    const safe = transaction || {};
    return (
      safe.pix_code ||
      safe.qrcode ||
      safe.qrCode ||
      safe.copyPaste ||
      (safe.paymentMethodData &&
        safe.paymentMethodData.pix &&
        (safe.paymentMethodData.pix.qrcode ||
          safe.paymentMethodData.pix.qrCode ||
          safe.paymentMethodData.pix.copyPaste ||
          safe.paymentMethodData.pix.code)) ||
      ""
    );
  }

  async init() {
    this.state = await window.__amzBridge.getState();

    if (!this.state || !this.state.attribution_id) {
      this.showError("Não foi possível carregar os dados do pedido.");
      return;
    }

    if (this.state.matched_event_object_id) {
      await this.checkStatus(this.state.matched_event_object_id);
    } else {
      await this.createTransaction();
    }

    this.setupEventListeners();
  }

  async createTransaction() {
    try {
      const amountCents =
        this.toCents(this.state.amountCents) ||
        this.toCents(this.state.amount) ||
        this.toCents(this.state.totalAmount) ||
        13850;
      const buyer = this.state.buyer || this.state;

      const response = await fetch(this.config.createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributionId: this.state.attribution_id,
          sessionId: this.state.session_id,
          amount: amountCents,
          buyer,
        }),
      });

      const result = await response.json();
      if (result.ok && result.transaction) {
        this.transaction = result.transaction;
        this.renderUI(result.transaction);
        this.startPolling(result.transaction.id);
      } else {
        this.showError("Erro ao gerar PIX: " + (result.message || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("PixUIManager createTransaction error:", error);
      this.showError("Erro de conexão ao gerar o PIX.");
    }
  }

  async checkStatus(txId) {
    if (this.isChecking || !txId) return;
    this.isChecking = true;

    try {
      const response = await fetch(this.config.statusUrl + encodeURIComponent(txId), {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.ok) {
        const status = String(result.status || "").toLowerCase();
        if (["paid", "approved", "confirmed", "completed"].includes(status)) {
          this.stopPolling();
          window.location.href = this.config.successRedirect;
          return;
        }

        if (result.transaction) {
          this.transaction = result.transaction;
          this.renderUI(result.transaction);
          this.startPolling(txId);
        }
      }
    } catch (error) {
      console.error("PixUIManager checkStatus error:", error);
    } finally {
      this.isChecking = false;
    }
  }

  startPolling(txId) {
    if (this.statusInterval) return;
    this.statusInterval = setInterval(() => this.checkStatus(txId), this.config.pollInterval);
  }

  stopPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  renderUI(transaction) {
    const pixCode = this.extractPixCode(transaction);
    if (!pixCode) {
      this.showError("Código PIX não recebido do servidor.");
      return;
    }

    const qrContainer = document.getElementById("pix-qrcode-container");
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: pixCode,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      const image = qrContainer.querySelector("img");
      if (image) {
        image.style.margin = "auto";
      }
    }

    const copyBtn = document.querySelector('[data-testid="Upx-Prepare-PrimaryButton"]');
    if (copyBtn) {
      copyBtn.onclick = (event) => {
        event.preventDefault();
        this.copyToClipboard(pixCode, copyBtn);
      };
    }

    const heading = document.querySelector('h1[data-testid="heading"]');
    if (heading && !heading.textContent.includes("Total a pagar:")) {
      heading.textContent = "Aguardando pagamento...";
    }
  }

  setupEventListeners() {
    const checkBtn = document.getElementById("check-payment-btn");
    if (!checkBtn) return;

    checkBtn.onclick = async (event) => {
      event.preventDefault();
      checkBtn.textContent = "Verificando...";
      checkBtn.disabled = true;

      const txId =
        (this.transaction && this.transaction.id) || this.state.matched_event_object_id;
      await this.checkStatus(txId);

      setTimeout(() => {
        checkBtn.textContent = "Já paguei";
        checkBtn.disabled = false;
      }, 1500);
    };
  }

  copyToClipboard(text, button) {
    const originalText = button.textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        button.textContent = "Código copiado";
        button.style.backgroundColor = "#007600";
        button.style.color = "#fff";
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = "";
          button.style.color = "";
        }, 2500);
      })
      .catch(() => {
        alert("Falha ao copiar. Copie manualmente.");
      });
  }

  showError(message) {
    const heading = document.querySelector('h1[data-testid="heading"]');
    if (heading) {
      heading.textContent = "Ops! Algo deu errado.";
      heading.style.color = "red";
    }
    console.error("PixUIManager:", message);
  }
}

window.__pixManager = new PixUIManager();
document.addEventListener("DOMContentLoaded", () => window.__pixManager.init());
