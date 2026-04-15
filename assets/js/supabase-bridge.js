/**
 * Supabase Analytics & Checkout Bridge
 * Replaces localStorage with Supabase-backed persistence.
 */
(function() {
    const Bridge = {
        state: {},
        pageId: '',
        
        getAttributionId() {
            let id = localStorage.getItem('amz_attribution_id') || sessionStorage.getItem('amz_attribution_id');
            if (!id) {
                id = 'attr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
                localStorage.setItem('amz_attribution_id', id);
            }
            return id;
        },

        getSessionId() {
            let id = sessionStorage.getItem('amz_session_id');
            if (!id) {
                id = 'sess_' + Math.random().toString(36).substring(2, 11);
                sessionStorage.setItem('amz_session_id', id);
            }
            return id;
        },

        async init(pageId) {
            this.pageId = pageId;
            const attrId = this.getAttributionId();
            const sessId = this.getSessionId();

            // Tracking initialization
            try {
                await fetch('/api/analytics/attribution', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attributionId: attrId,
                        sessionId: sessId,
                        pageId: pageId,
                        currentPage: window.location.pathname,
                        firstTouch: { pageUrl: window.location.href, capturedAt: new Date().toISOString() }
                    })
                });
            } catch (e) {
                console.warn('Tracking bridge init failed:', e);
            }

            // Load remote state
            await this.load();
        },

        async load() {
            const attrId = this.getAttributionId();
            try {
                const res = await fetch(`/api/checkout/state?attributionId=${attrId}`);
                const data = await res.json();
                if (data.state) {
                    this.state = data.state.buyer || {};
                    this.state.amount = data.state.amount || this.state.amount;
                    console.log('Bridge: Remote state loaded', this.state);
                }
            } catch (e) {
                console.warn('Bridge: Load failed', e);
            }
            return this.state;
        },

        async save(data) {
            const attrId = this.getAttributionId();
            const sessId = this.getSessionId();
            
            // Merge into local state
            this.state = { ...this.state, ...data };
            
            try {
                await fetch('/api/checkout/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attributionId: attrId,
                        sessionId: sessId,
                        pageId: this.pageId,
                        stage: this.pageId,
                        amount: this.state.totalAmount || this.state.amount || 0,
                        buyer: this.state,
                        capturedAt: new Date().toISOString()
                    })
                });
            } catch (e) {
                console.warn('Bridge: Save failed', e);
            }
        },

        get(key) {
            return this.state[key];
        },

        validateFields(selectors) {
            let valid = true;
            let firstInvalid = null;

            for (const key in selectors) {
                const selector = selectors[key];
                const el = document.querySelector(selector);
                if (!el || !el.value || el.value.trim().length === 0) {
                    valid = false;
                    if (el) {
                        el.style.borderColor = 'red';
                        if (!firstInvalid) firstInvalid = el;
                    }
                } else {
                    if (el) el.style.borderColor = '';
                }
            }

            if (!valid && firstInvalid) {
                firstInvalid.focus();
                alert('Por favor, preencha todos os campos obrigatórios.');
            }

            return valid;
        }
    };

    window.__amzBridge = Bridge;
})();
