(() => {
  const form = document.getElementById('question-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('question-status');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Envoi de votre message…';
    status.hidden = true;
    status.classList.remove('error');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams(new FormData(form)).toString(),
        signal: AbortSignal.timeout(30000),
      });
      const receipt = await response.text();
      if (!response.ok || !receipt.includes('lgt-question-receipt-v1')) throw new Error('Transmission non vérifiée');
      form.hidden = true;
      status.textContent = 'Merci, votre message a été reçu. Notre équipe vous répondra à l’adresse e-mail indiquée.';
    } catch {
      status.classList.add('error');
      status.textContent = 'La réception de votre message n’a pas pu être vérifiée. Vos informations sont conservées dans le formulaire ; veuillez réessayer.';
    } finally {
      status.hidden = false;
      status.focus();
      button.disabled = false;
      button.textContent = 'Envoyer mon message';
    }
  });
})();
