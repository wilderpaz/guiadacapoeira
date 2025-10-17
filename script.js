// Definições de API
const GEMINI_API_KEY = '';
const GEMINI_API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Função utilitária para chamar a API Gemini com retry (backoff).
 * @param {string} prompt - O prompt de entrada para a IA.
 * @param {HTMLElement} loadingElement - O elemento do spinner de carregamento.
 * @param {HTMLElement} outputElement - O elemento de saída para mostrar/esconder.
 * @param {number} maxRetries - Número máximo de tentativas de retry.
 */
async function callGeminiApi(prompt, loadingElement, outputElement, maxRetries = 3) {
    outputElement.classList.add('hidden');
    loadingElement.classList.remove('hidden');
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
    };
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(GEMINI_API_URL_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429 && i < maxRetries - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`Erro de resposta da API: ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            loadingElement.classList.add('hidden');
            if (text) {
                return text;
            } else {
                return 'Não foi possível gerar conteúdo. Tente uma frase diferente.';
            }
        } catch (error) {
            loadingElement.classList.add('hidden');
            console.error('Erro na chamada da API Gemini:', error);
            return `Erro: ${error.message}`;
        }
    }
    return 'O servidor demorou muito para responder. Tente novamente mais tarde.';
}

document.addEventListener('DOMContentLoaded', function () {
    // --- Variáveis Globais de Componentes ---
    const body = document.body;
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNav = document.getElementById('mobile-nav');
    const contentSections = document.querySelectorAll('.content-section');
    const collapsibleHeaders = document.querySelectorAll('.collapsible');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('[data-tab-content]');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const movimentoCards = document.querySelectorAll('.movimento-card');
    const groupsContainer = document.getElementById('groups-container');


    // --- 1. Lógica do Modo Dia/Noite ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    let isDarkMode = localStorage.getItem('theme') === 'dark';
    if (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDarkMode = true;
    }

    function applyTheme(darkMode) {
        if (darkMode) {
            body.classList.replace('light-mode', 'dark-mode');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.replace('dark-mode', 'light-mode');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
            localStorage.setItem('theme', 'light');
        }
    }
    applyTheme(isDarkMode);

    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        applyTheme(isDarkMode);
    });
    
    // --- 2. Lógica de Navegação Principal e Tabs ---
    function switchSection(targetId) {
        contentSections.forEach(section => {
            if ('#' + section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        navLinks.forEach(link => {
            if (link.getAttribute('href') === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        if (mobileNav.value !== targetId) {
            mobileNav.value = targetId;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            switchSection(targetId);
        });
    });

    mobileNav.addEventListener('change', (e) => {
        const targetId = e.target.value;
        switchSection(targetId);
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabPanes.forEach(pane => {
                if (pane.dataset.tabContent === targetTab) {
                    pane.classList.remove('hidden');
                    pane.classList.add('active');
                } else {
                    pane.classList.add('hidden');
                    pane.classList.remove('active');
                }
            });
        });
    });
    
    // --- 3. Filtro de Movimentos ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            movimentoCards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- 4. Collapsible (História) ---
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const arrow = header.querySelector('span');
            const isExpanded = content.classList.toggle('expanded');
            arrow.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    });

    // --- 5. Funcionalidades da API Gemini ---

    // 5.1 Identificador de Estilo
    const styleIdentifyBtn = document.getElementById('style-identify-btn');
    const styleInput = document.getElementById('style-input');
    const identifiedStyle = document.getElementById('identified-style');
    const styleOutputArea = document.getElementById('style-output-area');
    const styleLoadingSpinner = document.getElementById('style-loading-spinner');

    styleIdentifyBtn.addEventListener('click', async () => {
        const userInput = styleInput.value.trim();
        if (userInput === '') return;
        
        const prompt = `Você é um especialista em capoeira. Analise a seguinte descrição de prática e determine se ela se alinha mais com Capoeira Angola, Regional ou Contemporânea. Forneça o nome do estilo em negrito e uma breve justificativa. A descrição é: "${userInput}".`;
        const analysis = await callGeminiApi(prompt, styleLoadingSpinner, styleOutputArea);

        identifiedStyle.textContent = analysis;
        styleOutputArea.classList.remove('hidden');
    });

    // 5.2 Gerador de Cantigas
    const generateBtn = document.getElementById('generate-btn');
    const songInput = document.getElementById('song-input');
    const generatedText = document.getElementById('generated-text');
    const outputArea = document.getElementById('output-area');
    const loadingSpinner = document.getElementById('loading-spinner');

    generateBtn.addEventListener('click', async () => {
        const userInput = songInput.value.trim();
        if (userInput === '') return;

        const prompt = `Você é um mestre de capoeira experiente. Crie uma linha de cantiga de capoeira que rime com a seguinte frase: "${userInput}". A resposta deve ser apenas a nova linha que rima.`;
        const newRhyme = await callGeminiApi(prompt, loadingSpinner, outputArea);

        generatedText.textContent = newRhyme;
        outputArea.classList.remove('hidden');
    });

    // 5.3 Guia Detalhado de Movimentos
    const guideBtn = document.getElementById('guide-btn');
    const moveInput = document.getElementById('move-input');
    const generatedGuide = document.getElementById('generated-guide');
    const guideOutputArea = document.getElementById('guide-output-area');
    const guideLoadingSpinner = document.getElementById('guide-loading-spinner');

    guideBtn.addEventListener('click', async () => {
        const userInput = moveInput.value.trim();
        if (userInput === '') return;
        
        const prompt = `Você é um instrutor de capoeira experiente. Forneça um guia passo a passo conciso para executar o movimento de capoeira chamado "${userInput}". Formate a resposta como uma lista de passos, usando um emoji de ponto para cada passo.`;
        const newGuide = await callGeminiApi(prompt, guideLoadingSpinner, guideOutputArea);

        generatedGuide.textContent = newGuide;
        guideOutputArea.classList.remove('hidden');
    });

    // 5.4 Gerador de Treino
    const trainingBtn = document.getElementById('training-btn');
    const trainingInput = document.getElementById('training-input');
    const generatedTraining = document.getElementById('generated-training');
    const trainingOutputArea = document.getElementById('training-output-area');
    const trainingLoadingSpinner = document.getElementById('training-loading-spinner');
    
    trainingBtn.addEventListener('click', async () => {
        const userInput = trainingInput.value.trim();
        if (userInput === '') return;

        const prompt = `Você é um instrutor de capoeira experiente. Crie um plano de treino detalhado e estruturado com base no seguinte objetivo: "${userInput}". O plano deve incluir: 1. Aquecimento, 2. Sequência de movimentos, 3. Exercícios de aprimoramento, 4. Finalização/Alongamento. Formate a resposta usando títulos, subtítulos e listas, tornando-a fácil de seguir e usando quebras de linha.`;
        
        const trainingPlan = await callGeminiApi(prompt, trainingLoadingSpinner, trainingOutputArea);

        generatedTraining.innerHTML = trainingPlan.replace(/\n/g, '<br>');
        trainingOutputArea.classList.remove('hidden');
    });

    // 5.5 Gerador de Ideias para Abadás
    const abadacBtn = document.getElementById('abadac-btn');
    const abadacInput = document.getElementById('abadac-input');
    const generatedAbadac = document.getElementById('generated-abadac');
    const abadacOutputArea = document.getElementById('abadac-output-area');
    const abadacLoadingSpinner = document.getElementById('abadac-loading-spinner');

    abadacBtn.addEventListener('click', async () => {
        const userInput = abadacInput.value.trim();
        if (userInput === '') return;

        const prompt = `Você é um designer de moda e logotipos especializado em capoeira. Com base na seguinte descrição, gere três ideias criativas para a logomarca e o uniforme de um grupo de capoeira. A descrição é: "${userInput}". Para cada ideia, forneça uma breve descrição do conceito, as cores sugeridas e a simbologia. Formate a resposta como uma lista numerada.`;
        const newIdeas = await callGeminiApi(prompt, abadacLoadingSpinner, abadacOutputArea);

        generatedAbadac.textContent = newIdeas;
        abadacOutputArea.classList.remove('hidden');
    });

    // 5.6 Diálogo com Mestre (Chat)
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatLoadingSpinner = document.getElementById('chat-loading-spinner');

    function addMessage(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('p-3', 'rounded-lg', 'max-w-[80%]', 'break-words');
        messageDiv.classList.add(isUser ? 'bg-blue-600 text-white ml-auto' : 'bg-stone-200 text-stone-800 mr-auto');
        messageDiv.textContent = text;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', async () => {
        const userInput = chatInput.value.trim();
        if (userInput === '') return;

        addMessage(userInput, true);
        chatInput.value = '';
        chatLoadingSpinner.classList.remove('hidden');
        
        const prompt = `Você é um sábio e experiente Mestre de Capoeira. Responda à seguinte pergunta sobre capoeira, história, filosofia ou movimentos de forma concisa e inspiradora, como se estivesse na roda. A pergunta é: "${userInput}".`;
        const mestreResponse = await callGeminiApi(prompt, chatLoadingSpinner, chatContainer);

        addMessage(mestreResponse, false);
        chatLoadingSpinner.classList.add('hidden');
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // 5.7 Redator de Contato com Grupo
    const contactBtn = document.getElementById('contact-btn');
    const contactInput = document.getElementById('contact-input');
    const generatedContact = document.getElementById('generated-contact');
    const contactOutputArea = document.getElementById('contact-output-area');
    const contactLoadingSpinner = document.getElementById('contact-loading-spinner');

    contactBtn.addEventListener('click', async () => {
        const userInput = contactInput.value.trim();
        if (userInput === '') return;

        const prompt = `Você é um assistente de comunicação formal. Crie um rascunho de e-mail ou mensagem para um mestre ou academia de capoeira com base no seguinte objetivo: "${userInput}". O rascunho deve ser educado, profissional e incluir uma saudação inicial e uma despedida formal. Formate o rascunho com quebras de linha para simular um corpo de e-mail.`;
        const draft = await callGeminiApi(prompt, contactLoadingSpinner, contactOutputArea);

        generatedContact.textContent = draft;
        contactOutputArea.classList.remove('hidden');
    });

    // 5.8 Gerador de Toques do Berimbau
    const rhythmBtn = document.getElementById('rhythm-btn');
    const rhythmInput = document.getElementById('rhythm-input');
    const generatedRhythm = document.getElementById('generated-rhythm');
    const rhythmOutputArea = document.getElementById('rhythm-output-area');
    const rhythmLoadingSpinner = document.getElementById('rhythm-loading-spinner');

    rhythmBtn.addEventListener('click', async () => {
        const userInput = rhythmInput.value.trim();
        if (userInput === '') return;
        
        const prompt = `Você é um mestre de bateria de capoeira experiente. Dado o seguinte sentimento ou tipo de jogo: "${userInput}", sugira o toque de berimbau mais apropriado (ex: Angola, São Bento Grande, Iúna) e explique concisamente o tipo de jogo associado. Formate a resposta com o toque em negrito e a explicação em seguida.`;
        const newRhythm = await callGeminiApi(prompt, rhythmLoadingSpinner, rhythmOutputArea);

        generatedRhythm.textContent = newRhythm;
        rhythmOutputArea.classList.remove('hidden');
    });


    // --- 6. Configuração e Lógica do Chart.js ---
    const costData = {
        labels: ['Berimbau', 'Pandeiro', 'Atabaque'],
        datasets: [{
            label: 'Custo Estimado (R$)',
            data: [150, 80, 250],
            backgroundColor: ['#f97316', '#0d9488', '#dc2626'],
            borderColor: ['#f97316', '#0d9488', '#dc2626'],
            borderWidth: 1
        }]
    };

    const costConfig = {
        type: 'bar',
        data: costData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            }
        }
    };

    new Chart(document.getElementById('costChart'), costConfig);
    
    // --- 7. Configuração e Lógica do Firebase (Base de Dados) ---
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    
    const form = document.getElementById('student-form');
    const formMessage = document.getElementById('form-message');
    const authStatus = document.getElementById('auth-status');
    
    let db, auth, userId;

    function initFirebase() {
        if (!window.firebase) {
            console.error("Firebase is not globally defined. Check module imports.");
            formMessage.textContent = 'Erro de inicialização: Firebase não carregado.';
            return;
        }

        try {
            const app = window.firebase.initializeApp(firebaseConfig);
            auth = window.firebase.getAuth(app);
            db = window.firebase.getFirestore(app);
            
            window.firebase.onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    authStatus.textContent = `Autenticado. ID do usuário: ${userId}`;
                } else {
                    try {
                        if (initialAuthToken) {
                            await window.firebase.signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            await window.firebase.signInAnonymously(auth);
                        }
                    } catch (error) {
                        console.error("Erro de autenticação Firebase:", error);
                        authStatus.textContent = `Erro de autenticação: ${error.message}`;
                    }
                }
            });

        } catch (error) {
            console.error("Erro ao inicializar o Firebase:", error);
            formMessage.textContent = 'Erro ao inicializar o Firebase. Verifique a configuração.';
        }
    }
    initFirebase();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            formMessage.textContent = 'Aguardando autenticação do banco de dados...';
            return;
        }
        const name = document.getElementById('student-name').value;
        const group = document.getElementById('student-group').value;
        const style = document.getElementById('student-style').value;
        const cordel = document.getElementById('student-cordel').value;
        const batizado = document.getElementById('student-batizado').value;
        const email = document.getElementById('student-email').value;
        const phone = document.getElementById('student-phone').value;
        
        if (!name || !group || !style || !cordel || !batizado || !email || !phone) {
            formMessage.textContent = 'Por favor, preencha todos os campos.';
            formMessage.style.color = '#dc2626';
            return;
        }

        try {
            const collectionPath = `/artifacts/${appId}/users/${userId}/alunos`;
            await window.firebase.addDoc(window.firebase.collection(db, collectionPath), {
                name,
                group,
                style,
                cordel,
                batizado,
                email,
                phone,
                timestamp: new Date()
            });
            formMessage.textContent = 'Aluno cadastrado com sucesso!';
            formMessage.style.color = '#16a34a';
            form.reset();
        } catch (error) {
            console.error("Erro ao adicionar documento:", error);
            formMessage.textContent = `Erro ao salvar: ${error.message}`;
            formMessage.style.color = '#dc2626';
        }
    });

    // --- 8. Dados e Renderização de Grupos de Capoeira ---
    const capoeiraGroups = [
        {
            logo: "https://placehold.co/100x100/3b82f6/fff?text=CCB",
            name: "Grupo Capoeira Brasil",
            masters: "Mestre Boneco, Mestre Paulinho Sabia, Mestre Paulão Ceará",
            address: "R. da Capoeira, 123 - Salvador, BA",
            branches: ["Rio de Janeiro, RJ", "São Paulo, SP", "Berlim, Alemanha"],
            cordSystem: "Verde, Amarela, Azul, etc.",
            phone: "+55 (71) 98765-4321",
            website: "http://www.grupocapoerabrasil.com",
            email: "contato@grupocapoerabrasil.com"
        },
        {
            logo: "https://placehold.co/100x100/15803d/fff?text=ABADÁ",
            name: "ABADÁ-Capoeira",
            masters: "Mestre Camisa",
            address: "R. da Paz, 456 - Rio de Janeiro, RJ",
            branches: ["São Paulo, SP", "Nova Iorque, EUA", "Paris, França"],
            cordSystem: "Verde, Amarela, Azul, Verde-Amarela, etc.",
            phone: "+55 (21) 98765-1234",
            website: "http://www.abadacapoeira.com",
            email: "info@abadacapoeira.com"
        },
        {
            logo: "https://placehold.co/100x100/dc2626/fff?text=CDO",
            name: "Cordão de Ouro",
            masters: "Mestre Suassuna, Mestre Cueca",
            address: "Av. da Liberdade, 789 - São Paulo, SP",
            branches: ["Salvador, BA", "Londres, Reino Unido", "Tóquio, Japão"],
            cordSystem: "Roxa, Marrom, Vermelha, etc.",
            phone: "+55 (11) 99876-5432",
            website: "http://www.cordaodeouro.com",
            email: "cordaodeouro@email.com"
        },
        {
            logo: "https://placehold.co/100x100/6b21a8/fff?text=Senzala",
            name: "Grupo Senzala de Capoeira",
            masters: "Mestre Peixinho, Mestre Gato, Mestre Sorriso",
            address: "R. dos Palmares, 101 - Rio de Janeiro, RJ",
            branches: ["Paris, França", "Amsterdã, Holanda"],
            cordSystem: "Branca, Cinza, Amarela, etc.",
            phone: "+55 (21) 99123-4567",
            website: "http://www.gruposenzala.com",
            email: "contato@gruposenzala.com"
        }
    ];

    function renderGroups() {
        let htmlContent = '';
        capoeiraGroups.forEach(group => {
            htmlContent += `
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center space-x-4 mb-4">
                        <img src="${group.logo}" alt="Logomarca do Grupo ${group.name}" class="w-16 h-16 rounded-full">
                        <h3 class="font-bold text-xl">${group.name}</h3>
                    </div>
                    <ul class="space-y-2 text-sm text-stone-600">
                        <li><strong>Mestres:</strong> ${group.masters}</li>
                        <li><strong>Endereço:</strong> ${group.address}</li>
                        <li><strong>Filiais:</strong> ${group.branches.join(", ")}</li>
                        <li><strong>Sistema de Cordas:</strong> ${group.cordSystem}</li>
                        <li><strong>Telefone:</strong> ${group.phone}</li>
                        <li><strong>Website:</strong> <a href="${group.website}" target="_blank" class="text-blue-600 hover:underline">${group.website}</a></li>
                        <li><strong>E-mail:</strong> <a href="mailto:${group.email}" class="text-blue-600 hover:underline">${group.email}</a></li>
                    </ul>
                </div>
            `;
        });
        groupsContainer.innerHTML = htmlContent;
    }
    renderGroups();
});
