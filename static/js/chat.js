// Floating Chat Widget Functionality
document.addEventListener('DOMContentLoaded', function() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const floatingChatBtn = document.getElementById('floating-chat-btn');
    const chatWidget = document.getElementById('chat-widget');
    const chatWidgetClose = document.getElementById('chat-widget-close');
    const chatWidgetForm = document.getElementById('chat-widget-form');
    const chatWidgetInput = document.getElementById('chat-widget-input');
    const chatWidgetMessages = document.getElementById('chat-widget-messages');
    const chatWidgetTyping = document.getElementById('chat-widget-typing');
    const chatWidgetEscalation = document.getElementById('chat-widget-escalation');
    const escalationFormSubmit = document.getElementById('escalation-form-submit');

    // Toggle chat widget
    floatingChatBtn.addEventListener('click', function() {
        const isActive = chatWidget.classList.contains('active');
        if (isActive) {
            chatWidget.classList.remove('active');
            floatingChatBtn.classList.add('minimized');
        } else {
            chatWidget.classList.add('active');
            floatingChatBtn.classList.remove('minimized');
            // Scroll to bottom when opening
            setTimeout(() => {
                chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;
            }, 100);
        }
    });

    // Close chat widget
    chatWidgetClose.addEventListener('click', function() {
        chatWidget.classList.remove('active');
        floatingChatBtn.classList.add('minimized');
    });

    // Handle chat form submission
    chatWidgetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = chatWidgetInput.value.trim();
        if (!message) return;

        // Add user message
        addWidgetMessage(message, 'user');
        chatWidgetInput.value = '';

        // Show typing indicator
        chatWidgetTyping.style.display = 'block';
        chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;

        try {
            const response = await fetch('/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            // Hide typing indicator
            chatWidgetTyping.style.display = 'none';

            if (data.escalate) {
                // Show escalation form
                chatWidgetForm.parentElement.style.display = 'none';
                chatWidgetEscalation.style.display = 'block';
                addWidgetMessage(data.reply, 'bot');
            } else {
                // Normal response
                addWidgetMessage(data.reply, 'bot');
            }
        } catch (error) {
            // Hide typing indicator on error
            chatWidgetTyping.style.display = 'none';
            addWidgetMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    });

    // Handle escalation form submission
    escalationFormSubmit.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('escalation-name').value.trim();
        const email = document.getElementById('escalation-email').value.trim();
        const phone = document.getElementById('escalation-phone').value.trim();
        const problem = document.getElementById('escalation-problem').value.trim();

        if (!name || !email || !phone || !problem) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetch('/chat/escalate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    problem: problem
                })
            });

            const data = await response.json();

            if (data.success) {
                addWidgetMessage('Thank you! Our team will contact you soon with a solution.', 'bot');
                // Reset form and hide it
                escalationFormSubmit.reset();
                chatWidgetEscalation.style.display = 'none';
                chatWidgetForm.parentElement.style.display = 'block';
            } else {
                alert('Error submitting your details. Please try again.');
            }
        } catch (error) {
            alert('Error submitting your details. Please try again.');
        }
    });

    function addWidgetMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-widget-message ${sender}`;

        messageDiv.innerHTML = `
            <div class="chat-widget-message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="chat-widget-message-content">
                <p>${content}</p>
            </div>
        `;

        // Insert before typing indicator
        chatWidgetMessages.insertBefore(messageDiv, chatWidgetTyping);
        chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;
    }
});
