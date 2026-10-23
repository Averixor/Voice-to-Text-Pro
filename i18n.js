/**
 * UI i18n: locale key = BCP-47 (same as the recognition language list).
 * Drives side panel UI for the selected `#language` value.
 *
 * Every `PACKS[locale]` ships native UI strings for that locale (including
 * `ru-RU` and `uk-UA`). Speech recognition language and punctuation helpers
 * follow the same locale key. Punctuation helpers (`punctRuQ`, `punctUkQ`, …)
 * embed locale tokens for high punctuation mode.
 */
(function () {
  const FALLBACK = "en-US";

  function punctRuQ() {
    return /\b(почему|зачем|как|кто|что|где|когда|сколько|чей|какой|который)\b/i;
  }
  function punctRuE() {
    return /\b(как|что за|ну и|ура|ой|ах|ого)\b/i;
  }
  function punctUkQ() {
    return /\b(чому|навіщо|як|хто|що|де|коли|скільки|чий|який|котрий)\b/i;
  }
  function punctUkE() {
    return /\b(як|ну і|ура|ой|ах|ого)\b/i;
  }
  function punctEnQ() {
    return /\b(why|what|where|when|who|whom|whose|how|which)\b/i;
  }
  function punctEnE() {
    return /\b(wow|hey|oh|ah|oops|yay)\b/i;
  }
  function punctEsQ() {
    return /\b(por qué|qué|cómo|cuándo|dónde|quién|cuál|cuánto)\b/i;
  }
  function punctEsE() {
    return /\b(vaya|uf|ay|oh|eh|hurra)\b/i;
  }
  function punctFrQ() {
    return /\b(pourquoi|quoi|comment|quand|où|qui|quel|combien)\b/i;
  }
  function punctFrE() {
    return /\b(ah|oh|hé|ouf|bravo|chouette)\b/i;
  }
  function punctDeQ() {
    return /\b(warum|was|wie|wer|wo|wann|welche|welcher|wieviel)\b/i;
  }
  function punctDeE() {
    return /\b(ach|oh|hey|hurra|ups)\b/i;
  }
  function punctItQ() {
    return /\b(perché|come|cosa|chi|dove|quando|quale|quanto)\b/i;
  }
  function punctItE() {
    return /\b(uh|oh|ah|evviva|ehi)\b/i;
  }
  function punctJaQ() {
    return /(何|誰|いつ|どこ|どう|なぜ|いくつ)/;
  }
  function punctJaE() {
    return /(わあ|うわ|へえ|やった)/;
  }
  function punctKoQ() {
    return /(왜|뭐|어떻게|누구|언제|어디|얼마나)/;
  }
  function punctKoE() {
    return /(와|오|앗|우와)/;
  }
  function punctZhQ() {
    return /(什么|怎么|谁|哪|何时|多少|为什么|哪儿)/;
  }
  function punctZhE() {
    return /(哇|啊|哎呀|太好了)/;
  }

  function sessionRu(n) {
    const w =
      n % 10 === 1 && n % 100 !== 11
        ? "слово"
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
          ? "слова"
          : "слов";
    return `Сессия: ${n} ${w}`;
  }
  function sessionUk(n) {
    const w =
      n % 10 === 1 && n % 100 !== 11
        ? "слово"
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
          ? "слова"
          : "слів";
    return `Сесія: ${n} ${w}`;
  }
  function sessionEn(n) {
    return `Session: ${n} ${n === 1 ? "word" : "words"}`;
  }

  const LABELS = {
    "ru-RU": {
      ru: "Русский",
      en: "Английский (США)",
      uk: "Украинский",
      es: "Испанский",
      fr: "Французский",
      de: "Немецкий",
      it: "Итальянский",
      ja: "Японский",
      ko: "Корейский",
      zh: "Китайский",
    },
    "uk-UA": {
      ru: "Російська",
      en: "Англійська (США)",
      uk: "Українська",
      es: "Іспанська",
      fr: "Французька",
      de: "Німецька",
      it: "Італійська",
      ja: "Японська",
      ko: "Корейська",
      zh: "Китайська",
    },
    "en-US": {
      ru: "Russian",
      en: "English (US)",
      uk: "Ukrainian",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
    },
    "es-ES": {
      ru: "Ruso",
      en: "Inglés (EE. UU.)",
      uk: "Ucraniano",
      es: "Español",
      fr: "Francés",
      de: "Alemán",
      it: "Italiano",
      ja: "Japonés",
      ko: "Coreano",
      zh: "Chino",
    },
    "fr-FR": {
      ru: "Russe",
      en: "Anglais (É.-U.)",
      uk: "Ukrainien",
      es: "Espagnol",
      fr: "Français",
      de: "Allemand",
      it: "Italien",
      ja: "Japonais",
      ko: "Coréen",
      zh: "Chinois",
    },
    "de-DE": {
      ru: "Russisch",
      en: "Englisch (USA)",
      uk: "Ukrainisch",
      es: "Spanisch",
      fr: "Französisch",
      de: "Deutsch",
      it: "Italienisch",
      ja: "Japanisch",
      ko: "Koreanisch",
      zh: "Chinesisch",
    },
    "it-IT": {
      ru: "Russo",
      en: "Inglese (USA)",
      uk: "Ucraino",
      es: "Spagnolo",
      fr: "Francese",
      de: "Tedesco",
      it: "Italiano",
      ja: "Giapponese",
      ko: "Coreano",
      zh: "Cinese",
    },
    "ja-JP": {
      ru: "ロシア語",
      en: "英語（米国）",
      uk: "ウクライナ語",
      es: "スペイン語",
      fr: "フランス語",
      de: "ドイツ語",
      it: "イタリア語",
      ja: "日本語",
      ko: "韓国語",
      zh: "中国語",
    },
    "ko-KR": {
      ru: "러시아어",
      en: "영어(미국)",
      uk: "우크라이나어",
      es: "스페인어",
      fr: "프랑스어",
      de: "독일어",
      it: "이탈리아어",
      ja: "일본어",
      ko: "한국어",
      zh: "중국어",
    },
    "zh-CN": {
      ru: "俄语",
      en: "英语（美国）",
      uk: "乌克兰语",
      es: "西班牙语",
      fr: "法语",
      de: "德语",
      it: "意大利语",
      ja: "日语",
      ko: "韩语",
      zh: "中文",
    },
  };

  function langLabelsFor(localeId) {
    const L = LABELS[localeId] || LABELS[FALLBACK];
    return {
      "ru-RU": L.ru,
      "en-US": L.en,
      "uk-UA": L.uk,
      "es-ES": L.es,
      "fr-FR": L.fr,
      "de-DE": L.de,
      "it-IT": L.it,
      "ja-JP": L.ja,
      "ko-KR": L.ko,
      "zh-CN": L.zh,
    };
  }

  const PACKS = {
    "ru-RU": {
      htmlLang: "ru",
      docTitle: "Голос в Текст Pro",
      headerTitle: "Голос в Текст Pro",
      tagline: "AI-пунктуация • Проверка орфографии",
      closeTitle: "Закрыть панель",
      closeAria: "Закрыть панель",
      editorAria: "Область распознанного текста",
      outputLabel: "Распознанный текст",
      outputPlaceholder: "Начните говорить...",
      overlayAria: "Подсказка",
      overlayMain: "Нажмите «Начать» и говорите",
      overlaySub: "Текст появится здесь",
      startTitle: "Начать запись (Ctrl+Shift+1)",
      pauseTitle: "Пауза — приостановить распознавание",
      stopTitle: "Остановить запись (Ctrl+Shift+2)",
      insertTitle: "Вставить текст в активное поле (Ctrl+Shift+I)",
      copyTitle: "Копировать текст",
      clearTitle: "Очистить текст (Ctrl+Del)",
      btnStart: "Начать",
      btnResume: "Продолжить",
      btnPause: "Пауза",
      btnStop: "Стоп",
      btnInsert: "Вставить",
      btnCopy: "Копировать",
      btnClear: "Очистить",
      labelLanguage: "Язык распознавания:",
      labelPunctuation: "AI Пунктуация:",
      punctOff: "Выкл",
      punctLow: "Низкий (только точки)",
      punctMedium: "Средний (запятые, точки)",
      punctHigh: "Высокий (вопросы, восклицания)",
      instructionsHeading: "Требуется доступ к микрофону",
      inst1: "Не используйте замок 🔒 сайта (GitHub и т.п.) — это не для расширения",
      inst2: "Нажмите «Разрешить микрофон» — вкладка слева откроется сама",
      inst3: "Один раз нажмите Allow — Chrome запомнит «Разрешить», как в настройках сайта",
      inst4: "Или откройте настройки Chrome ниже и поставьте Микрофон → Разрешить",
      btnMicSettings: "Разрешить микрофон",
      btnMicChromeSettings: "Открыть настройки микрофона Chrome",
      micPageDocTitle: "Микрофон — Голос в Текст Pro",
      micPageHeading: "Разрешить микрофон расширению",
      micPageBody:
        "Один раз дайте доступ микрофону именно этому расширению. Chrome запомнит выбор как «Разрешить». Сайты во вкладках это не затрагивает — они спрашивают доступ отдельно.",
      micPageAllowBtn: "Разрешить микрофон",
      micPageAllowedBtn: "Разрешено",
      micPageSuccess: "Микрофон разрешён. Окно закроется само…",
      micPageDenied:
        "Доступ запрещён. Нажмите «Разрешить» в запросе Chrome. Если ранее нажали «Блокировать», снимите блок в настройках микрофона для этого расширения.",
      micPageCloseHint: "После разрешения окно закроется автоматически.",
      recorderDocTitle: "Запись — Голос в Текст Pro",
      recorderHeading: "Микрофон расширения",
      recorderBody:
        "Распознавание речи идёт во вкладке расширения (не в боковой панели и не на сайте). Один раз разрешите микрофон — Chrome запомнит «Разрешить».",
      recorderNote:
        "Фоновая вкладка слева для распознавания. Разрешение микрофона запрашивается в боковой панели на вашей странице.",
      recorderListening: "Идёт запись… Вкладка работает в фоне.",
      recorderIdle: "Готово. Нажмите «Начать» в боковой панели.",
      recorderGrantedClosing: "Микрофон разрешён. Вкладка закроется сама…",
      recorderClosing: "Готово. Закрываем вкладку…",
      footerVersion: "v3.4.1 • Голос в Текст Pro",
      statusReady: "Готов к записи",
      statusRecording: "Идет запись...",
      statusPaused: "На паузе",
      statusStopped: "Запись остановлена",
      statusPreparing: "Подготовка...",
      statusMicWait: "Ожидание микрофона...",
      statusErrorGeneric: "Произошла ошибка",
      statusBrowserErr:
        "Ошибка: Ваш браузер не поддерживает Speech Recognition API.",
      errMic: "Нет доступа к микрофону",
      errMicDetail:
        "Нет доступа к микрофону расширения. Замок сайта в адресной строке не помогает — нажмите «Разрешить микрофон» в панели.",
      errNetwork: "Ошибка сети",
      errNetworkDetail: "Ошибка сети. Проверьте подключение.",
      errRecognition: "Ошибка распознавания",
      errStartFailed: "Не удалось запустить запись",
      toastNoText: "Нет текста для вставки",
      toastNoTab: "Нет активной вкладки",
      toastPasteFail: "Не удалось вставить текст",
      toastPasted: "Текст вставлен",
      toastPasteOk: "Текст успешно вставлен",
      toastCopied: "Текст скопирован в буфер обмена",
      toastCleared: "Текст очищен",
      privacyTitle: "Уведомление о конфиденциальности",
      privacyBody:
        "Распознавание речи использует облачный сервис Google Web Speech через интернет. Черновики хранятся локально в chrome.storage.local. Запись начинается только после согласия.",
      privacyAccept: "Принять и продолжить",
      privacyPolicyLink: "Политика конфиденциальности",
      privacyRequired: "Сначала примите уведомление о конфиденциальности",
      recognitionErrPrefix: "Ошибка:",
      sessionWords: sessionRu,
      punctQuestion: punctRuQ,
      punctExclaim: punctRuE,
    },
    "uk-UA": {
      htmlLang: "uk",
      docTitle: "Голос у Текст Pro",
      headerTitle: "Голос у Текст Pro",
      tagline: "AI-пунктуація • Перевірка орфографії",
      closeTitle: "Закрити панель",
      closeAria: "Закрити панель",
      editorAria: "Область розпізнаного тексту",
      outputLabel: "Розпізнаний текст",
      outputPlaceholder: "Почніть говорити...",
      overlayAria: "Підказка",
      overlayMain: "Натисніть «Почати» й говоріть",
      overlaySub: "Текст з’явиться тут",
      startTitle: "Почати запис (Ctrl+Shift+1)",
      pauseTitle: "Пауза — призупинити розпізнавання",
      stopTitle: "Зупинити запис (Ctrl+Shift+2)",
      insertTitle: "Вставити текст у активне поле (Ctrl+Shift+I)",
      copyTitle: "Копіювати текст",
      clearTitle: "Очистити текст (Ctrl+Del)",
      btnStart: "Почати",
      btnResume: "Продовжити",
      btnPause: "Пауза",
      btnStop: "Стоп",
      btnInsert: "Вставити",
      btnCopy: "Копіювати",
      btnClear: "Очистити",
      labelLanguage: "Мова розпізнавання:",
      labelPunctuation: "AI Пунктуація:",
      punctOff: "Вимкн.",
      punctLow: "Низький (лише крапки)",
      punctMedium: "Середній (коми, крапки)",
      punctHigh: "Високий (питання, оклики)",
      instructionsHeading: "Потрібен доступ до мікрофона",
      inst1: "Не використовуйте замок 🔒 сайту (GitHub тощо) — це не для розширення",
      inst2: "Натисніть «Дозволити мікрофон» — вкладка зліва відкриється сама",
      inst3: "Один раз натисніть Allow — Chrome запам’ятає «Дозволити», як у налаштуваннях",
      inst4: "Або відкрийте налаштування Chrome нижче і поставте Мікрофон → Дозволити",
      btnMicSettings: "Дозволити мікрофон",
      btnMicChromeSettings: "Відкрити налаштування мікрофона Chrome",
      micPageDocTitle: "Мікрофон — Голос у Текст Pro",
      micPageHeading: "Дозволити мікрофон розширенню",
      micPageBody:
        "Один раз надайте доступ мікрофону саме цьому розширенню. Chrome запам’ятає вибір як «Дозволити». Сайти у вкладках це не змінює — вони запитують доступ окремо.",
      micPageAllowBtn: "Дозволити мікрофон",
      micPageAllowedBtn: "Дозволено",
      micPageSuccess:
        "Мікрофон дозволено. Закрийте це вікно і натисніть «Почати» в бічній панелі.",
      micPageDenied:
        "Доступ заборонено. Натисніть «Дозволити» у запиті Chrome. Якщо раніше натиснули «Блокувати», зніміть блок у налаштуваннях мікрофона.",
      micPageCloseHint:
        "Після дозволу закрийте вікно і продовжте в бічній панелі.",
      recorderDocTitle: "Запис — Голос у Текст Pro",
      recorderHeading: "Мікрофон розширення",
      recorderBody:
        "Розпізнавання мови йде в цьому вікні розширення (не в бічній панелі і не на сайті). Один раз дозвольте мікрофон — Chrome запам’ятає «Дозволити».",
      recorderNote:
        "Це звичайна вкладка. Після дозволу мікрофона ви повернетесь на свою сторінку — вкладка лишиться в смужці. По «Стоп» вона закриється сама.",
      recorderListening: "Йде запис… Вкладка працює у фоні.",
      recorderIdle: "Готово. Натисніть «Почати» в бічній панелі.",
      recorderGrantedClosing: "Мікрофон дозволено. Вікно закриється само…",
      recorderClosing: "Готово. Закриваємо…",
      footerVersion: "v3.4.1 • Голос у Текст Pro",
      statusReady: "Готовий до запису",
      statusRecording: "Йде запис...",
      statusPaused: "На паузі",
      statusStopped: "Запис зупинено",
      statusPreparing: "Підготовка...",
      statusMicWait: "Очікування мікрофона...",
      statusErrorGeneric: "Сталася помилка",
      statusBrowserErr:
        "Помилка: ваш браузер не підтримує Speech Recognition API.",
      errMic: "Немає доступу до мікрофона",
      errMicDetail:
        "Немає доступу до мікрофона розширення. Відкрийте сторінку дозволу, натисніть «Дозволити», потім знову «Почати».",
      errNetwork: "Помилка мережі",
      errNetworkDetail: "Помилка мережі. Перевірте з’єднання.",
      errRecognition: "Помилка розпізнавання",
      errStartFailed: "Не вдалося почати запис",
      toastNoText: "Немає тексту для вставки",
      toastNoTab: "Немає активної вкладки",
      toastPasteFail: "Не вдалося вставити текст",
      toastPasted: "Текст вставлено",
      toastPasteOk: "Текст успішно вставлено",
      toastCopied: "Текст скопійовано в буфер обміну",
      toastCleared: "Текст очищено",
      privacyTitle: "Сповіщення про конфіденційність",
      privacyBody:
        "Розпізнавання мовлення використовує хмарний сервіс Google Web Speech через інтернет. Чернетки зберігаються локально в chrome.storage.local. Запис починається лише після згоди.",
      privacyAccept: "Прийняти й продовжити",
      privacyPolicyLink: "Політика конфіденційності",
      privacyRequired: "Спочатку прийміть сповіщення про конфіденційність",
      recognitionErrPrefix: "Помилка:",
      sessionWords: sessionUk,
      punctQuestion: punctUkQ,
      punctExclaim: punctUkE,
    },
    "en-US": {
      htmlLang: "en",
      docTitle: "Voice to Text Pro",
      headerTitle: "Voice to Text Pro",
      tagline: "AI punctuation • Spell check",
      closeTitle: "Close panel",
      closeAria: "Close panel",
      editorAria: "Recognized text area",
      outputLabel: "Recognized text",
      outputPlaceholder: "Start speaking...",
      overlayAria: "Hint",
      overlayMain: "Press “Start” and speak",
      overlaySub: "Text will appear here",
      startTitle: "Start recording (Ctrl+Shift+1)",
      pauseTitle: "Pause recognition",
      stopTitle: "Stop recording (Ctrl+Shift+2)",
      insertTitle: "Insert into focused field (Ctrl+Shift+I)",
      copyTitle: "Copy text",
      clearTitle: "Clear text (Ctrl+Del)",
      btnStart: "Start",
      btnResume: "Resume",
      btnPause: "Pause",
      btnStop: "Stop",
      btnInsert: "Insert",
      btnCopy: "Copy",
      btnClear: "Clear",
      labelLanguage: "Recognition language:",
      labelPunctuation: "AI punctuation:",
      punctOff: "Off",
      punctLow: "Low (periods only)",
      punctMedium: "Medium (commas, periods)",
      punctHigh: "High (questions, exclamations)",
      instructionsHeading: "Microphone access required",
      inst1: "Do not use the site 🔒 lock (GitHub, etc.) — not for the extension",
      inst2: "Press Allow microphone — a left tab opens by itself",
      inst3: "Press Allow once — Chrome remembers Allow (same as site details)",
      inst4: "Or open Chrome settings below and set Microphone → Allow",
      btnMicSettings: "Allow microphone",
      btnMicChromeSettings: "Open Chrome microphone settings",
      micPageDocTitle: "Microphone — Voice to Text Pro",
      micPageHeading: "Allow microphone for this extension",
      micPageBody:
        "Grant the microphone to this extension once. Chrome will remember Allow. Websites in other tabs are not affected — they ask separately.",
      micPageAllowBtn: "Allow microphone",
      micPageAllowedBtn: "Allowed",
      micPageSuccess:
        "Microphone allowed. Close this window and press Start in the side panel.",
      micPageDenied:
        "Access denied. Click Allow in the Chrome prompt. If you previously chose Block, remove the block in Chrome microphone settings for this extension.",
      micPageCloseHint:
        "After allowing, close this window and continue in the side panel.",
      recorderDocTitle: "Recorder — Voice to Text Pro",
      recorderHeading: "Extension microphone",
      recorderBody:
        "Speech recognition runs in this extension tab (not in the side panel and not on the website). Allow the mic once — Chrome remembers Allow.",
      recorderNote:
        "Opens as the first (leftmost) tab in the background — you stay on your page. Closes on Stop. Only the first mic permission may briefly show this tab.",
      recorderListening: "Recording… This tab stays in the background.",
      recorderIdle: "Ready. Press Start in the side panel.",
      recorderGrantedClosing: "Microphone allowed. This tab will close…",
      recorderClosing: "Done. Closing tab…",
      footerVersion: "v3.4.1 • Voice to Text Pro",
      statusReady: "Ready to record",
      statusRecording: "Recording...",
      statusPaused: "Paused",
      statusStopped: "Recording stopped",
      statusPreparing: "Preparing...",
      statusMicWait: "Waiting for microphone...",
      statusErrorGeneric: "An error occurred",
      statusBrowserErr:
        "Error: Your browser does not support the Speech Recognition API.",
      errMic: "No microphone access",
      errMicDetail:
        "No microphone access. Press Allow microphone in this panel and confirm the Chrome prompt on this tab.",
      errNetwork: "Network error",
      errNetworkDetail: "Network error. Check your connection.",
      errRecognition: "Recognition error",
      errStartFailed: "Could not start recording",
      toastNoText: "No text to insert",
      toastNoTab: "No active tab",
      toastPasteFail: "Could not insert text",
      toastPasted: "Text inserted",
      toastPasteOk: "Text inserted successfully",
      toastCopied: "Text copied to clipboard",
      toastCleared: "Text cleared",
      privacyTitle: "Privacy notice",
      privacyBody:
        "Speech recognition uses Google's Web Speech service over the internet. Drafts are stored locally in chrome.storage.local. Recording starts only after you accept.",
      privacyAccept: "Accept and continue",
      privacyPolicyLink: "Privacy Policy",
      privacyRequired: "Accept the privacy notice before recording",
      recognitionErrPrefix: "Error:",
      sessionWords: sessionEn,
      punctQuestion: punctEnQ,
      punctExclaim: punctEnE,
    },
    "es-ES": {
      htmlLang: "es",
      docTitle: "Voz a Texto Pro",
      headerTitle: "Voz a Texto Pro",
      tagline: "Puntuación IA • Corrector",
      closeTitle: "Cerrar panel",
      closeAria: "Cerrar panel",
      editorAria: "Área de texto reconocido",
      outputLabel: "Texto reconocido",
      outputPlaceholder: "Empiece a hablar...",
      overlayAria: "Sugerencia",
      overlayMain: "Pulse «Iniciar» y hable",
      overlaySub: "El texto aparecerá aquí",
      startTitle: "Iniciar grabación (Ctrl+Shift+1)",
      pauseTitle: "Pausar reconocimiento",
      stopTitle: "Detener grabación (Ctrl+Shift+2)",
      insertTitle: "Insertar en el campo activo (Ctrl+Shift+I)",
      copyTitle: "Copiar texto",
      clearTitle: "Borrar texto (Ctrl+Del)",
      btnStart: "Iniciar",
      btnResume: "Continuar",
      btnPause: "Pausa",
      btnStop: "Detener",
      btnInsert: "Insertar",
      btnCopy: "Copiar",
      btnClear: "Borrar",
      labelLanguage: "Idioma de reconocimiento:",
      labelPunctuation: "Puntuación IA:",
      punctOff: "Apagado",
      punctLow: "Bajo (solo puntos)",
      punctMedium: "Medio (comas, puntos)",
      punctHigh: "Alto (preguntas, exclamaciones)",
      instructionsHeading: "Se necesita acceso al micrófono",
      inst1: "Pulse el botón de abajo para abrir la página de la extensión",
      inst2: "Pulse «Permitir micrófono» y confirme en Chrome",
      inst3:
        "Chrome recordará Permitir para la extensión (los sitios no cambian)",
      inst4: "Cierre la ventana y pulse Iniciar otra vez en el panel",
      btnMicSettings: "Permitir micrófono en la extensión",
      btnMicChromeSettings: "Abrir ajustes del micrófono de Chrome",
      micPageDocTitle: "Micrófono — Voz a Texto Pro",
      micPageHeading: "Permitir el micrófono a la extensión",
      micPageBody:
        "Conceda el micrófono a esta extensión una vez. Chrome recordará Permitir. Los sitios en otras pestañas no se ven afectados.",
      micPageAllowBtn: "Permitir micrófono",
      micPageAllowedBtn: "Permitido",
      micPageSuccess:
        "Micrófono permitido. Cierre esta ventana y pulse Iniciar en el panel.",
      micPageDenied:
        "Acceso denegado. Pulse Permitir en el aviso de Chrome o quite el bloqueo en la configuración del micrófono.",
      micPageCloseHint:
        "Tras permitir, cierre la ventana y continúe en el panel lateral.",
      recorderDocTitle: "Grabadora — Voz a Texto Pro",
      recorderHeading: "Micrófono de la extensión",
      recorderBody:
        "El reconocimiento se ejecuta en esta ventana de la extensión (no en el panel ni en el sitio). Permita el micro una vez.",
      recorderNote:
        "Mantenga esta ventana abierta al grabar. Use Iniciar / Detener en el panel.",
      recorderListening:
        "Grabando… Puede minimizar, pero no cierre la ventana.",
      recorderIdle: "Listo. Pulse Iniciar en el panel lateral.",
      recorderGrantedClosing: "Micrófono permitido. Esta ventana se cerrará…",
      recorderClosing: "Listo. Cerrando…",
      footerVersion: "v3.4.1 • Voz a Texto Pro",
      statusReady: "Listo para grabar",
      statusRecording: "Grabando...",
      statusPaused: "En pausa",
      statusStopped: "Grabación detenida",
      statusPreparing: "Preparando...",
      statusMicWait: "Esperando al micrófono...",
      statusErrorGeneric: "Se produjo un error",
      statusBrowserErr: "Error: su navegador no admite Speech Recognition API.",
      errMic: "Sin acceso al micrófono",
      errMicDetail:
        "Sin acceso al micrófono de la extensión. Abra la página de permiso, pulse Permitir y luego Iniciar.",
      errNetwork: "Error de red",
      errNetworkDetail: "Error de red. Compruebe la conexión.",
      errRecognition: "Error de reconocimiento",
      errStartFailed: "No se pudo iniciar la grabación",
      toastNoText: "No hay texto para insertar",
      toastNoTab: "No hay pestaña activa",
      toastPasteFail: "No se pudo insertar el texto",
      toastPasted: "Texto insertado",
      toastPasteOk: "Texto insertado correctamente",
      toastCopied: "Texto copiado al portapapeles",
      toastCleared: "Texto borrado",
      privacyTitle: "Aviso de privacidad",
      privacyBody:
        "El reconocimiento de voz usa el servicio Web Speech de Google por internet. Los borradores se guardan localmente en chrome.storage.local. La grabación solo empieza tras aceptar.",
      privacyAccept: "Aceptar y continuar",
      privacyPolicyLink: "Política de privacidad",
      privacyRequired: "Acepte el aviso de privacidad antes de grabar",
      recognitionErrPrefix: "Error:",
      sessionWords(n) {
        return `Sesión: ${n} ${n === 1 ? "palabra" : "palabras"}`;
      },
      punctQuestion: punctEsQ,
      punctExclaim: punctEsE,
    },
    "fr-FR": {
      htmlLang: "fr",
      docTitle: "Voix en Texte Pro",
      headerTitle: "Voix en Texte Pro",
      tagline: "Ponctuation IA • Orthographe",
      closeTitle: "Fermer le panneau",
      closeAria: "Fermer le panneau",
      editorAria: "Zone de texte reconnu",
      outputLabel: "Texte reconnu",
      outputPlaceholder: "Commencez à parler...",
      overlayAria: "Astuce",
      overlayMain: "Appuyez sur « Démarrer » et parlez",
      overlaySub: "Le texte apparaîtra ici",
      startTitle: "Démarrer l’enregistrement (Ctrl+Shift+1)",
      pauseTitle: "Pause — suspendre la reconnaissance",
      stopTitle: "Arrêter l’enregistrement (Ctrl+Shift+2)",
      insertTitle: "Insérer dans le champ actif (Ctrl+Shift+I)",
      copyTitle: "Copier le texte",
      clearTitle: "Effacer le texte (Ctrl+Del)",
      btnStart: "Démarrer",
      btnResume: "Reprendre",
      btnPause: "Pause",
      btnStop: "Arrêter",
      btnInsert: "Insérer",
      btnCopy: "Copier",
      btnClear: "Effacer",
      labelLanguage: "Langue de reconnaissance :",
      labelPunctuation: "Ponctuation IA :",
      punctOff: "Désactivé",
      punctLow: "Faible (points seulement)",
      punctMedium: "Moyen (virgules, points)",
      punctHigh: "Élevé (questions, exclamations)",
      instructionsHeading: "Accès au microphone requis",
      inst1:
        "Cliquez sur le bouton ci-dessous pour ouvrir la page de l’extension",
      inst2: "Appuyez sur « Autoriser le micro » et confirmez dans Chrome",
      inst3: "Chrome mémorise Autoriser pour l’extension (les sites inchangés)",
      inst4:
        "Fermez la fenêtre et appuyez à nouveau sur Démarrer dans le panneau",
      btnMicSettings: "Autoriser le micro dans l’extension",
      btnMicChromeSettings: "Ouvrir les paramètres micro de Chrome",
      micPageDocTitle: "Microphone — Voix en Texte Pro",
      micPageHeading: "Autoriser le micro pour l’extension",
      micPageBody:
        "Accordez le micro une fois à cette extension. Chrome mémorise Autoriser. Les sites des autres onglets ne sont pas concernés.",
      micPageAllowBtn: "Autoriser le micro",
      micPageAllowedBtn: "Autorisé",
      micPageSuccess:
        "Micro autorisé. Fermez cette fenêtre et appuyez sur Démarrer dans le panneau.",
      micPageDenied:
        "Accès refusé. Cliquez sur Autoriser dans l’invite Chrome, ou retirez le blocage dans les paramètres du micro.",
      micPageCloseHint:
        "Après autorisation, fermez la fenêtre et continuez dans le panneau latéral.",
      recorderDocTitle: "Enregistreur — Voix en Texte Pro",
      recorderHeading: "Micro de l’extension",
      recorderBody:
        "La reconnaissance tourne dans cette fenêtre d’extension (pas dans le panneau ni sur le site). Autorisez le micro une fois.",
      recorderNote:
        "Gardez cette fenêtre ouverte pendant l’enregistrement. Démarrez / Arrêtez depuis le panneau.",
      recorderListening:
        "Enregistrement… Vous pouvez réduire la fenêtre, sans la fermer.",
      recorderIdle: "Prêt. Appuyez sur Démarrer dans le panneau latéral.",
      recorderGrantedClosing: "Micro autorisé. Cette fenêtre va se fermer…",
      recorderClosing: "Terminé. Fermeture…",
      footerVersion: "v3.4.1 • Voix en Texte Pro",
      statusReady: "Prêt à enregistrer",
      statusRecording: "Enregistrement...",
      statusPaused: "En pause",
      statusStopped: "Enregistrement arrêté",
      statusPreparing: "Préparation...",
      statusMicWait: "Attente du microphone...",
      statusErrorGeneric: "Une erreur s’est produite",
      statusBrowserErr:
        "Erreur : votre navigateur ne prend pas en charge Speech Recognition API.",
      errMic: "Pas d’accès au microphone",
      errMicDetail:
        "Pas d’accès au micro de l’extension. Ouvrez la page d’autorisation, autorisez, puis appuyez à nouveau sur Démarrer.",
      errNetwork: "Erreur réseau",
      errNetworkDetail: "Erreur réseau. Vérifiez la connexion.",
      errRecognition: "Erreur de reconnaissance",
      errStartFailed: "Impossible de démarrer l’enregistrement",
      toastNoText: "Aucun texte à insérer",
      toastNoTab: "Aucun onglet actif",
      toastPasteFail: "Impossible d’insérer le texte",
      toastPasted: "Texte inséré",
      toastPasteOk: "Texte inséré avec succès",
      toastCopied: "Texte copié dans le presse-papiers",
      toastCleared: "Texte effacé",
      privacyTitle: "Avis de confidentialité",
      privacyBody:
        "La reconnaissance vocale utilise le service Web Speech de Google via Internet. Les brouillons sont stockés localement dans chrome.storage.local. L'enregistrement ne démarre qu'après acceptation.",
      privacyAccept: "Accepter et continuer",
      privacyPolicyLink: "Politique de confidentialité",
      privacyRequired: "Acceptez l'avis de confidentialité avant d'enregistrer",
      recognitionErrPrefix: "Erreur :",
      sessionWords(n) {
        return `Session : ${n} ${n === 1 ? "mot" : "mots"}`;
      },
      punctQuestion: punctFrQ,
      punctExclaim: punctFrE,
    },
    "de-DE": {
      htmlLang: "de",
      docTitle: "Sprache zu Text Pro",
      headerTitle: "Sprache zu Text Pro",
      tagline: "KI-Zeichensetzung • Rechtschreibung",
      closeTitle: "Panel schließen",
      closeAria: "Panel schließen",
      editorAria: "Bereich für erkannten Text",
      outputLabel: "Erkannter Text",
      outputPlaceholder: "Sprechen Sie los...",
      overlayAria: "Hinweis",
      overlayMain: "„Start“ drücken und sprechen",
      overlaySub: "Text erscheint hier",
      startTitle: "Aufnahme starten (Strg+Umschalt+1)",
      pauseTitle: "Pause — Erkennung anhalten",
      stopTitle: "Aufnahme stoppen (Strg+Umschalt+2)",
      insertTitle: "In aktives Feld einfügen (Strg+Umschalt+I)",
      copyTitle: "Text kopieren",
      clearTitle: "Text löschen (Strg+Entf)",
      btnStart: "Start",
      btnResume: "Fortsetzen",
      btnPause: "Pause",
      btnStop: "Stopp",
      btnInsert: "Einfügen",
      btnCopy: "Kopieren",
      btnClear: "Leeren",
      labelLanguage: "Erkennungssprache:",
      labelPunctuation: "KI-Zeichensetzung:",
      punctOff: "Aus",
      punctLow: "Niedrig (nur Punkte)",
      punctMedium: "Mittel (Kommas, Punkte)",
      punctHigh: "Hoch (Fragen, Ausrufe)",
      instructionsHeading: "Mikrofonzugriff erforderlich",
      inst1: "Klicken Sie unten, um die Erweiterungsseite zu öffnen",
      inst2: "„Mikrofon erlauben“ drücken und in Chrome bestätigen",
      inst3:
        "Chrome speichert Zulassen für die Erweiterung (Websites unverändert)",
      inst4: "Fenster schließen und im Panel erneut auf Start drücken",
      btnMicSettings: "Mikrofon in der Erweiterung erlauben",
      btnMicChromeSettings: "Chrome-Mikrofoneinstellungen öffnen",
      micPageDocTitle: "Mikrofon — Sprache zu Text Pro",
      micPageHeading: "Mikrofon für die Erweiterung erlauben",
      micPageBody:
        "Erlauben Sie dem Mikrofon einmalig den Zugriff für diese Erweiterung. Chrome merkt sich Zulassen. Websites in anderen Tabs sind nicht betroffen.",
      micPageAllowBtn: "Mikrofon erlauben",
      micPageAllowedBtn: "Erlaubt",
      micPageSuccess:
        "Mikrofon erlaubt. Schließen Sie dieses Fenster und drücken Sie Start im Panel.",
      micPageDenied:
        "Zugriff verweigert. Klicken Sie in Chrome auf Zulassen oder entfernen Sie die Sperre in den Mikrofoneinstellungen.",
      micPageCloseHint:
        "Nach der Freigabe Fenster schließen und im Seitenpanel fortfahren.",
      recorderDocTitle: "Aufnahme — Sprache zu Text Pro",
      recorderHeading: "Mikrofon der Erweiterung",
      recorderBody:
        "Die Erkennung läuft in diesem Erweiterungsfenster (nicht im Panel und nicht auf der Website). Einmal erlauben.",
      recorderNote:
        "Fenster während der Aufnahme offen lassen. Start / Stopp im Seitenpanel.",
      recorderListening:
        "Aufnahme läuft… Fenster darf minimiert, aber nicht geschlossen werden.",
      recorderIdle: "Bereit. Im Seitenpanel auf Start drücken.",
      recorderGrantedClosing: "Mikrofon erlaubt. Dieses Fenster schließt sich…",
      recorderClosing: "Fertig. Wird geschlossen…",
      footerVersion: "v3.4.1 • Sprache zu Text Pro",
      statusReady: "Bereit zur Aufnahme",
      statusRecording: "Aufnahme läuft...",
      statusPaused: "Pausiert",
      statusStopped: "Aufnahme gestoppt",
      statusPreparing: "Vorbereitung...",
      statusMicWait: "Warte auf Mikrofon...",
      statusErrorGeneric: "Ein Fehler ist aufgetreten",
      statusBrowserErr:
        "Fehler: Ihr Browser unterstützt die Speech Recognition API nicht.",
      errMic: "Kein Mikrofonzugriff",
      errMicDetail:
        "Kein Mikrofonzugriff für die Erweiterung. Öffnen Sie die Freigabeseite, erlauben Sie den Zugriff und drücken Sie erneut Start.",
      errNetwork: "Netzwerkfehler",
      errNetworkDetail: "Netzwerkfehler. Verbindung prüfen.",
      errRecognition: "Erkennungsfehler",
      errStartFailed: "Aufnahme konnte nicht gestartet werden",
      toastNoText: "Kein Text zum Einfügen",
      toastNoTab: "Kein aktiver Tab",
      toastPasteFail: "Text konnte nicht eingefügt werden",
      toastPasted: "Text eingefügt",
      toastPasteOk: "Text erfolgreich eingefügt",
      toastCopied: "Text in die Zwischenablage kopiert",
      toastCleared: "Text geleert",
      privacyTitle: "Datenschutzhinweis",
      privacyBody:
        "Die Spracherkennung nutzt Googles Web-Speech-Dienst über das Internet. Entwürfe werden lokal in chrome.storage.local gespeichert. Die Aufnahme startet erst nach Ihrer Zustimmung.",
      privacyAccept: "Akzeptieren und fortfahren",
      privacyPolicyLink: "Datenschutzerklärung",
      privacyRequired:
        "Bitte akzeptieren Sie den Datenschutzhinweis vor der Aufnahme",
      recognitionErrPrefix: "Fehler:",
      sessionWords(n) {
        return `Sitzung: ${n} ${n === 1 ? "Wort" : "Wörter"}`;
      },
      punctQuestion: punctDeQ,
      punctExclaim: punctDeE,
    },
    "it-IT": {
      htmlLang: "it",
      docTitle: "Voce in Testo Pro",
      headerTitle: "Voce in Testo Pro",
      tagline: "Punteggiatura IA • Controllo ortografico",
      closeTitle: "Chiudi pannello",
      closeAria: "Chiudi pannello",
      editorAria: "Area testo riconosciuto",
      outputLabel: "Testo riconosciuto",
      outputPlaceholder: "Inizia a parlare...",
      overlayAria: "Suggerimento",
      overlayMain: "Premi «Avvia» e parla",
      overlaySub: "Il testo apparirà qui",
      startTitle: "Avvia registrazione (Ctrl+Shift+1)",
      pauseTitle: "Pausa — sospendi riconoscimento",
      stopTitle: "Ferma registrazione (Ctrl+Shift+2)",
      insertTitle: "Inserisci nel campo attivo (Ctrl+Shift+I)",
      copyTitle: "Copia testo",
      clearTitle: "Cancella testo (Ctrl+Del)",
      btnStart: "Avvia",
      btnResume: "Riprendi",
      btnPause: "Pausa",
      btnStop: "Stop",
      btnInsert: "Inserisci",
      btnCopy: "Copia",
      btnClear: "Cancella",
      labelLanguage: "Lingua di riconoscimento:",
      labelPunctuation: "Punteggiatura IA:",
      punctOff: "Spento",
      punctLow: "Basso (solo punti)",
      punctMedium: "Medio (virgole, punti)",
      punctHigh: "Alto (domande, esclamazioni)",
      instructionsHeading: "Accesso al microfono richiesto",
      inst1: "Fai clic sul pulsante sotto per aprire la pagina dell’estensione",
      inst2: "Premi «Consenti microfono» e conferma in Chrome",
      inst3: "Chrome ricorda Consenti per l’estensione (i siti non cambiano)",
      inst4: "Chiudi la finestra e premi di nuovo Avvia nel pannello",
      btnMicSettings: "Consenti microfono nell’estensione",
      btnMicChromeSettings: "Apri impostazioni microfono di Chrome",
      micPageDocTitle: "Microfono — Voce in Testo Pro",
      micPageHeading: "Consenti il microfono all’estensione",
      micPageBody:
        "Concedi il microfono una volta a questa estensione. Chrome ricorda Consenti. I siti nelle altre schede non sono interessati.",
      micPageAllowBtn: "Consenti microfono",
      micPageAllowedBtn: "Consentito",
      micPageSuccess:
        "Microfono consentito. Chiudi questa finestra e premi Avvia nel pannello.",
      micPageDenied:
        "Accesso negato. Fai clic su Consenti nella richiesta di Chrome oppure rimuovi il blocco nelle impostazioni del microfono.",
      micPageCloseHint:
        "Dopo aver consentito, chiudi la finestra e continua nel pannello laterale.",
      recorderDocTitle: "Registratore — Voce in Testo Pro",
      recorderHeading: "Microfono dell’estensione",
      recorderBody:
        "Il riconoscimento avviene in questa finestra dell’estensione (non nel pannello né sul sito). Consenti il microfono una volta.",
      recorderNote:
        "Tieni aperta questa finestra durante la registrazione. Avvia / Ferma dal pannello.",
      recorderListening:
        "Registrazione… Puoi ridurre la finestra, ma non chiuderla.",
      recorderIdle: "Pronto. Premi Avvia nel pannello laterale.",
      recorderGrantedClosing:
        "Microfono consentito. Questa finestra si chiuderà…",
      recorderClosing: "Fatto. Chiusura…",
      footerVersion: "v3.4.1 • Voce in Testo Pro",
      statusReady: "Pronto a registrare",
      statusRecording: "Registrazione in corso...",
      statusPaused: "In pausa",
      statusStopped: "Registrazione fermata",
      statusPreparing: "Preparazione...",
      statusMicWait: "In attesa del microfono...",
      statusErrorGeneric: "Si è verificato un errore",
      statusBrowserErr:
        "Errore: il browser non supporta Speech Recognition API.",
      errMic: "Nessun accesso al microfono",
      errMicDetail:
        "Nessun accesso al microfono dell’estensione. Apri la pagina di autorizzazione, consenti e premi di nuovo Avvia.",
      errNetwork: "Errore di rete",
      errNetworkDetail: "Errore di rete. Controlla la connessione.",
      errRecognition: "Errore di riconoscimento",
      errStartFailed: "Impossibile avviare la registrazione",
      toastNoText: "Nessun testo da inserire",
      toastNoTab: "Nessuna scheda attiva",
      toastPasteFail: "Impossibile inserire il testo",
      toastPasted: "Testo inserito",
      toastPasteOk: "Testo inserito correttamente",
      toastCopied: "Testo copiato negli appunti",
      toastCleared: "Testo cancellato",
      privacyTitle: "Informativa sulla privacy",
      privacyBody:
        "Il riconoscimento vocale usa il servizio Web Speech di Google via Internet. Le bozze sono salvate in locale in chrome.storage.local. La registrazione inizia solo dopo l'accettazione.",
      privacyAccept: "Accetta e continua",
      privacyPolicyLink: "Informativa sulla privacy",
      privacyRequired:
        "Accetta l'informativa sulla privacy prima di registrare",
      recognitionErrPrefix: "Errore:",
      sessionWords(n) {
        return `Sessione: ${n} ${n === 1 ? "parola" : "parole"}`;
      },
      punctQuestion: punctItQ,
      punctExclaim: punctItE,
    },
    "ja-JP": {
      htmlLang: "ja",
      docTitle: "音声テキスト変換 Pro",
      headerTitle: "音声テキスト変換 Pro",
      tagline: "AI句読点 • スペルチェック",
      closeTitle: "パネルを閉じる",
      closeAria: "パネルを閉じる",
      editorAria: "認識テキスト領域",
      outputLabel: "認識されたテキスト",
      outputPlaceholder: "話し始めてください...",
      overlayAria: "ヒント",
      overlayMain: "「開始」を押して話す",
      overlaySub: "テキストがここに表示されます",
      startTitle: "録音開始 (Ctrl+Shift+1)",
      pauseTitle: "一時停止",
      stopTitle: "録音停止 (Ctrl+Shift+2)",
      insertTitle: "フォーカス中の欄に挿入 (Ctrl+Shift+I)",
      copyTitle: "コピー",
      clearTitle: "クリア (Ctrl+Del)",
      btnStart: "開始",
      btnResume: "再開",
      btnPause: "一時停止",
      btnStop: "停止",
      btnInsert: "挿入",
      btnCopy: "コピー",
      btnClear: "クリア",
      labelLanguage: "認識言語:",
      labelPunctuation: "AI句読点:",
      punctOff: "オフ",
      punctLow: "低（句点のみ）",
      punctMedium: "中（読点・句点）",
      punctHigh: "高（疑問・感嘆）",
      instructionsHeading: "マイクの許可が必要です",
      inst1: "下のボタンで拡張機能の許可ページを開く",
      inst2: "「マイクを許可」を押し、Chrome の確認で許可する",
      inst3: "Chrome が拡張機能への許可を記憶します（サイトは変わりません）",
      inst4: "ウィンドウを閉じ、パネルで再度「開始」を押す",
      btnMicSettings: "拡張機能でマイクを許可",
      btnMicChromeSettings: "Chrome のマイク設定を開く",
      micPageDocTitle: "マイク — 音声テキスト変換 Pro",
      micPageHeading: "拡張機能にマイクを許可",
      micPageBody:
        "この拡張機能に一度だけマイクを許可してください。Chrome が許可を記憶します。他のタブのサイトには影響しません。",
      micPageAllowBtn: "マイクを許可",
      micPageAllowedBtn: "許可済み",
      micPageSuccess:
        "マイクを許可しました。このウィンドウを閉じ、サイドパネルで開始を押してください。",
      micPageDenied:
        "拒否されました。Chrome の確認で許可してください。以前ブロックした場合はマイク設定で解除してください。",
      micPageCloseHint:
        "許可後、ウィンドウを閉じてサイドパネルに戻ってください。",
      recorderDocTitle: "録音 — 音声テキスト変換 Pro",
      recorderHeading: "拡張機能のマイク",
      recorderBody:
        "音声認識はこの拡張機能ウィンドウで行います（サイドパネルやサイトではありません）。一度マイクを許可してください。",
      recorderNote:
        "録音中はこのウィンドウを閉じないでください。開始 / 停止はサイドパネルから。",
      recorderListening: "録音中… 最小化は可能ですが、閉じないでください。",
      recorderIdle: "準備完了。サイドパネルで開始を押してください。",
      recorderGrantedClosing:
        "マイクを許可しました。このウィンドウは自動で閉じます…",
      recorderClosing: "完了。閉じています…",
      footerVersion: "v3.4.1 • 音声テキスト変換 Pro",
      statusReady: "録音の準備ができました",
      statusRecording: "録音中...",
      statusPaused: "一時停止中",
      statusStopped: "録音を停止しました",
      statusPreparing: "準備中...",
      statusMicWait: "マイク待ち...",
      statusErrorGeneric: "エラーが発生しました",
      statusBrowserErr:
        "エラー: お使いのブラウザは Speech Recognition API に対応していません。",
      errMic: "マイクにアクセスできません",
      errMicDetail:
        "拡張機能のマイク許可がありません。許可ページで許可してから、もう一度開始を押してください。",
      errNetwork: "ネットワークエラー",
      errNetworkDetail: "ネットワークを確認してください。",
      errRecognition: "認識エラー",
      errStartFailed: "録音を開始できませんでした",
      toastNoText: "挿入するテキストがありません",
      toastNoTab: "アクティブなタブがありません",
      toastPasteFail: "テキストを挿入できませんでした",
      toastPasted: "テキストを挿入しました",
      toastPasteOk: "テキストを挿入しました",
      toastCopied: "クリップボードにコピーしました",
      toastCleared: "テキストを消去しました",
      privacyTitle: "プライバシー通知",
      privacyBody:
        "音声認識はインターネット経由で Google の Web Speech サービスを使用します。下書きは chrome.storage.local にローカル保存されます。録音は同意後にのみ開始されます。",
      privacyAccept: "同意して続ける",
      privacyPolicyLink: "プライバシーポリシー",
      privacyRequired: "録音の前にプライバシー通知に同意してください",
      recognitionErrPrefix: "エラー:",
      sessionWords(n) {
        return `セッション: ${n} 語`;
      },
      punctQuestion: punctJaQ,
      punctExclaim: punctJaE,
    },
    "ko-KR": {
      htmlLang: "ko",
      docTitle: "음성을 텍스트로 Pro",
      headerTitle: "음성을 텍스트로 Pro",
      tagline: "AI 구두점 • 맞춤법",
      closeTitle: "패널 닫기",
      closeAria: "패널 닫기",
      editorAria: "인식된 텍스트 영역",
      outputLabel: "인식된 텍스트",
      outputPlaceholder: "말을 시작하세요...",
      overlayAria: "안내",
      overlayMain: "「시작」을 누르고 말하세요",
      overlaySub: "텍스트가 여기에 표시됩니다",
      startTitle: "녹음 시작 (Ctrl+Shift+1)",
      pauseTitle: "일시정지",
      stopTitle: "녹음 중지 (Ctrl+Shift+2)",
      insertTitle: "포커스 필드에 삽입 (Ctrl+Shift+I)",
      copyTitle: "복사",
      clearTitle: "지우기 (Ctrl+Del)",
      btnStart: "시작",
      btnResume: "계속",
      btnPause: "일시정지",
      btnStop: "중지",
      btnInsert: "삽입",
      btnCopy: "복사",
      btnClear: "지우기",
      labelLanguage: "인식 언어:",
      labelPunctuation: "AI 구두점:",
      punctOff: "끔",
      punctLow: "낮음 (마침표만)",
      punctMedium: "보통 (쉼표, 마침표)",
      punctHigh: "높음 (물음표, 느낌표)",
      instructionsHeading: "마이크 권한이 필요합니다",
      inst1: "아래 버튼으로 확장 프로그램 권한 페이지 열기",
      inst2: "「마이크 허용」을 누르고 Chrome 확인에서 허용",
      inst3: "Chrome이 확장 프로그램 허용을 기억합니다(사이트는 그대로)",
      inst4: "창을 닫고 패널에서 다시 시작을 누르세요",
      btnMicSettings: "확장 프로그램에서 마이크 허용",
      btnMicChromeSettings: "Chrome 마이크 설정 열기",
      micPageDocTitle: "마이크 — 음성을 텍스트로 Pro",
      micPageHeading: "확장 프로그램에 마이크 허용",
      micPageBody:
        "이 확장 프로그램에 마이크를 한 번 허용하세요. Chrome이 허용을 기억합니다. 다른 탭의 사이트에는 영향이 없습니다.",
      micPageAllowBtn: "마이크 허용",
      micPageAllowedBtn: "허용됨",
      micPageSuccess:
        "마이크가 허용되었습니다. 이 창을 닫고 사이드 패널에서 시작을 누르세요.",
      micPageDenied:
        "거부되었습니다. Chrome 확인에서 허용하세요. 이전에 차단했다면 마이크 설정에서 해제하세요.",
      micPageCloseHint: "허용 후 창을 닫고 사이드 패널로 돌아가세요.",
      recorderDocTitle: "녹음 — 음성을 텍스트로 Pro",
      recorderHeading: "확장 프로그램 마이크",
      recorderBody:
        "음성 인식은 이 확장 프로그램 창에서 실행됩니다(사이드 패널/사이트 아님). 마이크를 한 번 허용하세요.",
      recorderNote:
        "녹음 중에는 이 창을 닫지 마세요. 시작 / 정지는 사이드 패널에서.",
      recorderListening: "녹음 중… 최소화는 가능하지만 닫지 마세요.",
      recorderIdle: "준비됨. 사이드 패널에서 시작을 누르세요.",
      recorderGrantedClosing: "마이크가 허용되었습니다. 이 창이 곧 닫힙니다…",
      recorderClosing: "완료. 닫는 중…",
      footerVersion: "v3.4.1 • 음성을 텍스트로 Pro",
      statusReady: "녹음 준비됨",
      statusRecording: "녹음 중...",
      statusPaused: "일시정지됨",
      statusStopped: "녹음 중지됨",
      statusPreparing: "준비 중...",
      statusMicWait: "마이크 대기 중...",
      statusErrorGeneric: "오류가 발생했습니다",
      statusBrowserErr:
        "오류: 브라우저가 Speech Recognition API를 지원하지 않습니다.",
      errMic: "마이크 액세스 없음",
      errMicDetail:
        "확장 프로그램 마이크 권한이 없습니다. 권한 페이지에서 허용한 뒤 다시 시작을 누르세요.",
      errNetwork: "네트워크 오류",
      errNetworkDetail: "네트워크 오류. 연결을 확인하세요.",
      errRecognition: "인식 오류",
      errStartFailed: "녹음을 시작할 수 없습니다",
      toastNoText: "삽입할 텍스트 없음",
      toastNoTab: "활성 탭 없음",
      toastPasteFail: "텍스트를 삽입할 수 없습니다",
      toastPasted: "텍스트 삽입됨",
      toastPasteOk: "텍스트가 삽입되었습니다",
      toastCopied: "클립보드에 복사됨",
      toastCleared: "텍스트 지워짐",
      privacyTitle: "개인정보 안내",
      privacyBody:
        "음성 인식은 인터넷을 통해 Google Web Speech 서비스를 사용합니다. 초안은 chrome.storage.local에 로컬로 저장됩니다. 동의 후에만 녹음이 시작됩니다.",
      privacyAccept: "동의하고 계속",
      privacyPolicyLink: "개인정보 처리방침",
      privacyRequired: "녹음 전에 개인정보 안내에 동의해 주세요",
      recognitionErrPrefix: "오류:",
      sessionWords(n) {
        return `세션: ${n}단어`;
      },
      punctQuestion: punctKoQ,
      punctExclaim: punctKoE,
    },
    "zh-CN": {
      htmlLang: "zh-CN",
      docTitle: "语音转文本 Pro",
      headerTitle: "语音转文本 Pro",
      tagline: "AI 标点 • 拼写检查",
      closeTitle: "关闭面板",
      closeAria: "关闭面板",
      editorAria: "识别文本区域",
      outputLabel: "识别的文本",
      outputPlaceholder: "开始说话...",
      overlayAria: "提示",
      overlayMain: "点击「开始」并说话",
      overlaySub: "文字将显示在这里",
      startTitle: "开始录音 (Ctrl+Shift+1)",
      pauseTitle: "暂停识别",
      stopTitle: "停止录音 (Ctrl+Shift+2)",
      insertTitle: "插入到当前焦点字段 (Ctrl+Shift+I)",
      copyTitle: "复制文本",
      clearTitle: "清除文本 (Ctrl+Del)",
      btnStart: "开始",
      btnResume: "继续",
      btnPause: "暂停",
      btnStop: "停止",
      btnInsert: "插入",
      btnCopy: "复制",
      btnClear: "清除",
      labelLanguage: "识别语言：",
      labelPunctuation: "AI 标点：",
      punctOff: "关",
      punctLow: "低（仅句号）",
      punctMedium: "中（逗号、句号）",
      punctHigh: "高（问号、感叹号）",
      instructionsHeading: "需要麦克风权限",
      inst1: "点击下方按钮打开扩展权限页",
      inst2: "点击「允许麦克风」并在 Chrome 提示中确认",
      inst3: "Chrome 会记住对本扩展的允许（网站不受影响）",
      inst4: "关闭窗口后在面板中再次点击开始",
      btnMicSettings: "在扩展中允许麦克风",
      btnMicChromeSettings: "打开 Chrome 麦克风设置",
      micPageDocTitle: "麦克风 — 语音转文本 Pro",
      micPageHeading: "允许扩展使用麦克风",
      micPageBody:
        "请为本扩展授予一次麦克风权限。Chrome 会记住允许。其他标签页中的网站不受影响。",
      micPageAllowBtn: "允许麦克风",
      micPageAllowedBtn: "已允许",
      micPageSuccess: "已允许麦克风。请关闭此窗口并在侧边栏点击开始。",
      micPageDenied:
        "已拒绝。请在 Chrome 提示中点击允许；若曾选择阻止，请在麦克风设置中解除。",
      micPageCloseHint: "允许后关闭窗口，继续在侧边栏操作。",
      recorderDocTitle: "录音 — 语音转文本 Pro",
      recorderHeading: "扩展麦克风",
      recorderBody:
        "语音识别在此扩展窗口中运行（不在侧边栏或网站上）。请允许一次麦克风。",
      recorderNote: "录音时请保持此窗口打开。在侧边栏使用开始 / 停止。",
      recorderListening: "正在录音… 可以最小化，但请勿关闭。",
      recorderIdle: "就绪。请在侧边栏点击开始。",
      recorderGrantedClosing: "已允许麦克风。窗口即将自动关闭…",
      recorderClosing: "完成。正在关闭…",
      footerVersion: "v3.4.1 • 语音转文本 Pro",
      statusReady: "准备录音",
      statusRecording: "正在录音...",
      statusPaused: "已暂停",
      statusStopped: "录音已停止",
      statusPreparing: "准备中...",
      statusMicWait: "等待麦克风...",
      statusErrorGeneric: "发生错误",
      statusBrowserErr: "错误：您的浏览器不支持 Speech Recognition API。",
      errMic: "无麦克风权限",
      errMicDetail: "扩展没有麦克风权限。请在权限页允许后再次点击开始。",
      errNetwork: "网络错误",
      errNetworkDetail: "网络错误，请检查连接。",
      errRecognition: "识别错误",
      errStartFailed: "无法开始录音",
      toastNoText: "没有可插入的文本",
      toastNoTab: "没有活动标签页",
      toastPasteFail: "无法插入文本",
      toastPasted: "文本已插入",
      toastPasteOk: "文本插入成功",
      toastCopied: "文本已复制到剪贴板",
      toastCleared: "文本已清除",
      privacyTitle: "隐私声明",
      privacyBody:
        "语音识别通过互联网使用 Google Web Speech 服务。草稿保存在本地 chrome.storage.local。仅在您同意后才会开始录音。",
      privacyAccept: "同意并继续",
      privacyPolicyLink: "隐私政策",
      privacyRequired: "开始录音前请先同意隐私声明",
      recognitionErrPrefix: "错误：",
      sessionWords(n) {
        return `会话：${n} 个词`;
      },
      punctQuestion: punctZhQ,
      punctExclaim: punctZhE,
    },
  };

  function normalizeLocale(code) {
    if (!code) return FALLBACK;
    if (PACKS[code]) return code;
    const base = String(code).split("-")[0].toLowerCase();
    const found = Object.keys(PACKS).find(
      (k) => k.toLowerCase().split("-")[0] === base,
    );
    return found || FALLBACK;
  }

  function getPack(code) {
    const id = normalizeLocale(code);
    const base = PACKS[id];
    const labels = langLabelsFor(id);
    return {
      id,
      ...base,
      langLabels: labels,
      punctQuestionRe: base.punctQuestion(),
      punctExclaimRe: base.punctExclaim(),
    };
  }

  const root =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : {};

  root.AppI18n = {
    getPack,
    normalizeLocale,
    FALLBACK,
  };
})();
