/**
 * Amazon PIX UI Manager
 * Handles transaction creation, QR rendering, polling, and status checking.
 */
class PixUIManager {
    constructor() {
        this.config = {
            createUrl: '/api/pix/create',
            statusUrl: '/api/pix/status/',
            pollInterval: 5000, // 5 seconds
            successRedirect: 'success.html'
        };
        this.state = null;
        this.transaction = null;
        this.statusInterval = null;
        this.isChecking = false;
    }

    async init() {
        console.log('PixUIManager: Initializing...');
        this.state = await window.__amzBridge.getState();
        
        if (!this.state || !this.state.attribution_id) {
            console.error('PixUIManager: No state or attributionId found.');
            return;
        }

        // Check if we already have a transaction
        if (this.state.matched_event_object_id) {
            console.log('PixUIManager: Found existing transaction ID:', this.state.matched_event_object_id);
            await this.checkStatus(this.state.matched_event_object_id);
        } else {
            await this.createTransaction();
        }

        this.setupEventListeners();
    }

    async createTransaction() {
        console.log('PixUIManager: Creating new PIX transaction...');
        try {
            const response = await fetch(this.config.createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributionId: this.state.attribution_id,
                    amount: this.state.amount || 4510.50,
                    buyer: this.state.buyer
                })
            });

            const result = await response.json();
            if (result.ok && result.transaction) {
                this.transaction = result.transaction;
                this.renderUI(result.transaction);
                this.startPolling(result.transaction.id);
            } else {
                this.showError('Erro ao gerar PIX: ' + (result.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('PixUIManager: Error creating transaction:', error);
            this.showError('Erro de conexão ao gerar PIX.');
        }
    }

    async checkStatus(txId) {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            const response = await fetch(this.config.statusUrl + txId);
            const result = await response.json();
            
            if (result.ok) {
                if (result.status === 'paid' || result.status === 'confirmed') {
                    this.stopPolling();
                    window.location.href = this.config.successRedirect;
                } else if (result.transaction) {
                    // Update UI if we didn't have the transaction data yet (e.g. after refresh)
                    if (!this.transaction) {
                        this.transaction = result.transaction;
                        this.renderUI(result.transaction);
                        this.startPolling(txId);
                    }
                }
            }
        } catch (error) {
            console.error('PixUIManager: Error checking status:', error);
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

    renderUI(tx) {
        const pixCode = tx.paymentMethodData?.pix?.qrcode || tx.pix_code; // Adjust based on TitansHub response structure
        if (!pixCode) {
            this.showError('Código PIX não recebido do servidor.');
            return;
        }

        // 1. Render QR Code
        const qrContainer = document.getElementById('pix-qrcode-container');
        if (qrContainer && window.QRCode) {
            qrContainer.innerHTML = ''; // Clear placeholder
            new QRCode(qrContainer, {
                text: pixCode,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            // Ensure any SVG/Canvas inside is responsive
            const img = qrContainer.querySelector('img');
            if (img) img.style.margin = 'auto';
        }

        // 2. Setup Copy Button
        const copyBtn = document.querySelector('[data-testid="Upx-Prepare-PrimaryButton"]');
        if (copyBtn) {
            copyBtn.onclick = (e) => {
                e.preventDefault();
                this.copyToClipboard(pixCode, copyBtn);
            };
        }

        // 3. Update Heading/Instructions
        const heading = document.querySelector('h1[data-testid="heading"]');
        if (heading) {
            heading.textContent = 'Aguardando pagamento...';
        }
    }

    setupEventListeners() {
        // Handle "Já paguei" button
        const checkBtn = document.getElementById('check-payment-btn');
        if (checkBtn) {
            checkBtn.onclick = async (e) => {
                e.preventDefault();
                checkBtn.textContent = 'Verificando...';
                checkBtn.disabled = true;
                
                const txId = (this.transaction && this.transaction.id) || this.state.matched_event_object_id;
                if (txId) {
                    await this.checkStatus(txId);
                    setTimeout(() => {
                        if (checkBtn) {
                            checkBtn.textContent = 'Já paguei';
                            checkBtn.disabled = false;
                        }
                    }, 2000);
                } else {
                    checkBtn.textContent = 'Tente novamente';
                    checkBtn.disabled = false;
                }
            };
        }
    }

    copyToClipboard(text, btn) {
        const originalText = btn.textContent;
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✓ Código copiado!';
            btn.style.backgroundColor = '#007600';
            btn.style.color = '#fff';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }, 3000);
        }).catch(err => {
            console.error('Copy failed', err);
            alert('Falha ao copiar. Por favor, copie manualmente.');
        });
    }

    showError(msg) {
        const heading = document.querySelector('h1[data-testid="heading"]');
        if (heading) {
            heading.textContent = 'Ops! Algo deu errado.';
            heading.style.color = 'red';
        }
        console.error('PixUIManager Error:', msg);
    }
}

// Global instance
window.__pixManager = new PixUIManager();
document.addEventListener('DOMContentLoaded', () => window.__pixManager.init());
