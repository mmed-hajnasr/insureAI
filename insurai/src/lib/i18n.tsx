import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"

type LanguageCode = "en" | "fr" | "tn"

type I18nContextValue = {
    language: LanguageCode
    setLanguage: (language: LanguageCode) => void
    cycleLanguage: () => void
    t: (key: string, fallback?: string) => string
}

const STORAGE_KEY = "insurai.language"

const translations: Record<LanguageCode, Record<string, string>> = {
    en: {
        "app.loading": "Loading...",
        "lang.switch": "Language",
        "lang.en": "English",
        "lang.fr": "Français",
        "lang.tn": "تونسي",
        "brand.home": "InsurAI home",

        "nav.how": "How It Works",
        "nav.insurers": "For Insurers",
        "nav.browseOffers": "Browse Offers",
        "nav.browse": "Browse",
        "nav.login": "Login",
        "nav.getStarted": "Get Started",

        "hero.badge": "Tunisia's first insurance discovery layer",
        "hero.title": "Insurance in Tunisia, finally explained.",
        "hero.subtitle": "Answer a few questions. We match you with the right coverage. You walk into the agency ready.",
        "hero.who": "Who",
        "hero.coverage": "Coverage",
        "hero.budget": "Budget",
        "hero.start": "Start matching",

        "how.kicker": "How it works",
        "how.title": "Three steps to the right coverage",
        "how.subtitle": "Structured guidance, transparent options, and a final shortlist you can bring to your insurer without confusion.",
        "how.step1.title": "Answer 5 questions",
        "how.step1.desc": "Our chatbot identifies your needs based on your life situation.",
        "how.step2.title": "We match you",
        "how.step2.desc": "See ranked offers from all Tunisian insurers in one place.",
        "how.step3.title": "Visit your agency",
        "how.step3.desc": "We prepare a summary card you bring to the insurer. No confusion, no guesswork.",

        "auth.secure": "Secure onboarding",
        "auth.trusted": "Trusted by early users",
        "auth.leftTitle": "Insurance guidance made for Tunisia.",
        "auth.leftStat": "1,200 agents for 12.5M people. You need clarity before you visit.",
        "auth.metric1": "Residents navigating insurance choices",
        "auth.metric2": "Current insurance penetration rate",
        "auth.quote1": "Find your coverage in minutes",
        "auth.quote2": "No agent needed",
        "auth.quote3": "Tunisia's smartest insurance tool",

        "login.title": "Welcome back",
        "login.subtitle": "Sign in to your InsurAI account",
        "login.email": "Email",
        "login.password": "Password",
        "login.forgot": "Forgot password?",
        "login.signIn": "Sign In",
        "login.signingIn": "Signing in...",
        "login.continue": "or continue with",
        "login.google": "Continue with Google",
        "login.noAccount": "Don't have an account?",
        "login.getStarted": "Get started →",

        "signup.title": "Create your account",
        "signup.subtitle": "Choose your profile and get matched in minutes",
        "signup.profile": "1. Profile",
        "signup.details": "2. Details",
        "signup.step1": "Step 1: Select account type",
        "signup.step2": "Step 2: Account details",
        "signup.changeType": "Change type",
        "signup.selectTypeHint": "Select an account type on the left to continue.",
        "signup.individual": "I'm an individual",
        "signup.company": "I represent a company",
        "signup.insurer": "I'm an insurer",
        "signup.individualDesc": "Find and compare insurance for myself or my family",
        "signup.companyDesc": "Get insurance coverage for my employees",
        "signup.insurerDesc": "List my products and reach digital customers",
        "signup.fullName": "Full name",
        "signup.companyName": "Company name",
        "signup.industry": "Industry",
        "signup.employees": "Number of employees",
        "signup.confirmPassword": "Confirm password",
        "signup.createMyAccount": "Create My Account",
        "signup.createCompany": "Create Company Account",
        "signup.apply": "Apply for Listing",
        "signup.creating": "Creating account...",
        "signup.submitting": "Submitting...",
        "signup.already": "Already have an account?",
        "signup.signIn": "Sign in",

        "platform.signOut": "Sign out",
        "platform.profile": "Get My Insurance Profile",
        "platform.search": "Search coverage, insurer, or benefit",
        "platform.reset": "Reset Filters",
        "platform.newChat": "New chat",
        "platform.assistant": "InsurAI Assistant",
        "platform.ready": "Ready to guide you",
        "platform.typeMessage": "Type your message",

        "chat.signOut": "Sign out",
        "chat.newChat": "New chat",
        "chat.back": "Back to offers",
        "chat.opening": "Ahlan! I'm here to help you find the right insurance. Tell me — what would you like to protect today?",
        "chat.error.unexpected": "We hit an unexpected issue while contacting the assistant.",
        "chat.aria.back": "Back to offers",
        "chat.aria.send": "Send message",
        "chat.quick.health.label": "Health packs",
        "chat.quick.health.message": "List Health packs from RealAssurance",
        "chat.quick.auto.label": "Auto category",
        "chat.quick.auto.message": "In category Auto, what should I choose?",
        "chat.quick.family.label": "Family coverage",
        "chat.quick.family.message": "I have a car loan and a family, what assurance should I prioritize?",
        "chat.quick.best.label": "Best overall",
        "chat.quick.best.message": "Search all categories and all agencies, then give me the best recommendation.",

        "footer.tagline": "Tunisia's insurance discovery platform.",
        "footer.product": "Product",
        "footer.company": "Company",
        "footer.legal": "Legal",
        "footer.made": "Made in Tunisia",
        "footer.rights": "All rights reserved.",
    },
    fr: {
        "app.loading": "Chargement...",
        "lang.switch": "Langue",
        "lang.en": "English",
        "lang.fr": "Français",
        "lang.tn": "تونسي",
        "brand.home": "Accueil InsurAI",
        "nav.how": "Comment ça marche",
        "nav.insurers": "Pour les assureurs",
        "nav.browseOffers": "Voir les offres",
        "nav.browse": "Parcourir",
        "nav.login": "Connexion",
        "nav.getStarted": "Commencer",
        "hero.badge": "La première plateforme tunisienne de découverte d'assurance",
        "hero.title": "L'assurance en Tunisie, enfin expliquée.",
        "hero.subtitle": "Répondez à quelques questions. On vous propose la couverture adaptée. Vous allez en agence préparé.",
        "hero.who": "Qui",
        "hero.coverage": "Couverture",
        "hero.budget": "Budget",
        "hero.start": "Commencer",
        "how.kicker": "Comment ça marche",
        "how.title": "Trois étapes vers la bonne couverture",
        "how.subtitle": "Guidage structuré, options transparentes et shortlist finale à apporter à votre assureur.",
        "how.step1.title": "Répondez à 5 questions",
        "how.step1.desc": "Notre chatbot identifie vos besoins selon votre situation.",
        "how.step2.title": "On vous propose",
        "how.step2.desc": "Voyez les offres classées des assureurs tunisiens au même endroit.",
        "how.step3.title": "Visitez votre agence",
        "how.step3.desc": "On prépare une fiche récapitulative pour éviter la confusion.",
        "auth.secure": "Inscription sécurisée",
        "auth.trusted": "Approuvé par les premiers utilisateurs",
        "auth.leftTitle": "Un guidage assurance pensé pour la Tunisie.",
        "auth.leftStat": "1 200 agents pour 12,5M d'habitants. Vous avez besoin de clarté.",
        "auth.metric1": "Résidents qui cherchent la bonne assurance",
        "auth.metric2": "Taux de pénétration actuel",
        "auth.quote1": "Trouvez votre couverture en quelques minutes",
        "auth.quote2": "Sans passer par un agent",
        "auth.quote3": "L'outil assurance le plus intelligent en Tunisie",
        "login.title": "Bon retour",
        "login.subtitle": "Connectez-vous à votre compte InsurAI",
        "login.email": "E-mail",
        "login.password": "Mot de passe",
        "login.forgot": "Mot de passe oublié ?",
        "login.signIn": "Se connecter",
        "login.signingIn": "Connexion...",
        "login.continue": "ou continuer avec",
        "login.google": "Continuer avec Google",
        "login.noAccount": "Vous n'avez pas de compte ?",
        "login.getStarted": "Commencer →",
        "signup.title": "Créez votre compte",
        "signup.subtitle": "Choisissez votre profil et obtenez des options en quelques minutes",
        "signup.profile": "1. Profil",
        "signup.details": "2. Détails",
        "signup.step1": "Étape 1 : Choisir le type de compte",
        "signup.step2": "Étape 2 : Détails du compte",
        "signup.changeType": "Changer le type",
        "signup.selectTypeHint": "Sélectionnez un type de compte à gauche pour continuer.",
        "signup.individual": "Je suis un particulier",
        "signup.company": "Je représente une entreprise",
        "signup.insurer": "Je suis un assureur",
        "signup.individualDesc": "Trouver et comparer une assurance pour moi ou ma famille",
        "signup.companyDesc": "Trouver une couverture pour mes employés",
        "signup.insurerDesc": "Publier mes produits et toucher des clients digitaux",
        "signup.fullName": "Nom complet",
        "signup.companyName": "Nom de l'entreprise",
        "signup.industry": "Secteur",
        "signup.employees": "Nombre d'employés",
        "signup.confirmPassword": "Confirmer le mot de passe",
        "signup.createMyAccount": "Créer mon compte",
        "signup.createCompany": "Créer un compte entreprise",
        "signup.apply": "Demander un référencement",
        "signup.creating": "Création du compte...",
        "signup.submitting": "Envoi...",
        "signup.already": "Vous avez déjà un compte ?",
        "signup.signIn": "Se connecter",
        "platform.signOut": "Déconnexion",
        "platform.profile": "Obtenir mon profil assurance",
        "platform.search": "Rechercher couverture, assureur ou avantage",
        "platform.reset": "Réinitialiser les filtres",
        "platform.newChat": "Nouveau chat",
        "platform.assistant": "Assistant InsurAI",
        "platform.ready": "Prêt à vous guider",
        "platform.typeMessage": "Tapez votre message",
        "chat.signOut": "Déconnexion",
        "chat.newChat": "Nouveau chat",
        "chat.back": "Retour aux offres",
        "chat.opening": "Ahlan ! Je suis là pour vous aider à trouver la bonne assurance. Dites-moi ce que vous voulez protéger.",
        "chat.error.unexpected": "Nous avons rencontré un problème inattendu en contactant l'assistant.",
        "chat.aria.back": "Retour aux offres",
        "chat.aria.send": "Envoyer le message",
        "chat.quick.health.label": "Packs santé",
        "chat.quick.health.message": "Liste les packs santé de RealAssurance",
        "chat.quick.auto.label": "Catégorie auto",
        "chat.quick.auto.message": "Dans la catégorie Auto, que dois-je choisir ?",
        "chat.quick.family.label": "Couverture familiale",
        "chat.quick.family.message": "J'ai un crédit auto et une famille, quelle assurance dois-je prioriser ?",
        "chat.quick.best.label": "Meilleur global",
        "chat.quick.best.message": "Cherche toutes les catégories et toutes les agences, puis donne-moi la meilleure recommandation.",
        "footer.tagline": "La plateforme tunisienne de découverte d'assurance.",
        "footer.product": "Produit",
        "footer.company": "Entreprise",
        "footer.legal": "Légal",
        "footer.made": "Fait en Tunisie",
        "footer.rights": "Tous droits réservés.",
    },
    tn: {
        "app.loading": "جار التحميل...",
        "lang.switch": "اللّغة",
        "lang.en": "English",
        "lang.fr": "Français",
        "lang.tn": "تونسي",
        "brand.home": "الرئيسية متاع InsurAI",
        "nav.how": "كيفاش تخدم",
        "nav.insurers": "للشركات",
        "nav.browseOffers": "شوف العروض",
        "nav.browse": "تصفّح",
        "nav.login": "دخول",
        "nav.getStarted": "ابدا",
        "hero.badge": "أول منصة تونسية تفهمك التأمين",
        "hero.title": "التأمين في تونس، ولى واضح.",
        "hero.subtitle": "جاوب على شوية أسئلة، وإحنا نلقاولك التغطية اللي تليق بيك.",
        "hero.who": "شكون",
        "hero.coverage": "التغطية",
        "hero.budget": "الميزانية",
        "hero.start": "ابدا التوجيه",
        "how.kicker": "كيفاش تخدم",
        "how.title": "3 مراحل باش تلقى التغطية المناسبة",
        "how.subtitle": "توجيه واضح، خيارات شفافة، وقايمة أخيرة تاخوها معاك للوكالة.",
        "how.step1.title": "جاوب على 5 أسئلة",
        "how.step1.desc": "الشاتبوت يفهم وضعيتك ويحدد حاجتك.",
        "how.step2.title": "نقترحولك",
        "how.step2.desc": "تشوف عروض شركات التأمين الكل في بلاصة وحدة.",
        "how.step3.title": "امشي للوكالة",
        "how.step3.desc": "نحضرو بطاقة تلخيص باش كل شي يكون واضح.",
        "auth.secure": "تسجيل مؤمّن",
        "auth.trusted": "موثوق من أول المستعملين",
        "auth.leftTitle": "توجيه تأمين على قياس تونس.",
        "auth.leftStat": "1200 أجان على 12.5 مليون ساكن. يلزمك وضوح قبل ما تمشي.",
        "auth.metric1": "مواطنين يختارو التأمين",
        "auth.metric2": "نسبة انتشار التأمين",
        "auth.quote1": "القِ تغطيتك في دقايق",
        "auth.quote2": "من غير ضغط أجان",
        "auth.quote3": "أذكى أداة تأمين في تونس",
        "login.title": "مرحبا بيك من جديد",
        "login.subtitle": "ادخل لحسابك في InsurAI",
        "login.email": "الإيميل",
        "login.password": "كلمة السر",
        "login.forgot": "نسيت كلمة السر؟",
        "login.signIn": "ادخل",
        "login.signingIn": "قاعدين ندخلو...",
        "login.continue": "ولا كمّل بـ",
        "login.google": "كمّل بـ Google",
        "login.noAccount": "ما عندكش حساب؟",
        "login.getStarted": "ابدا →",
        "signup.title": "اعمل حسابك",
        "signup.subtitle": "اختار بروفيلك وخلّيك جاهز في دقايق",
        "signup.profile": "1. البروفيل",
        "signup.details": "2. التفاصيل",
        "signup.step1": "المرحلة 1: اختار نوع الحساب",
        "signup.step2": "المرحلة 2: تفاصيل الحساب",
        "signup.changeType": "بدّل النوع",
        "signup.selectTypeHint": "اختار نوع الحساب من اليسار باش تكمل.",
        "signup.individual": "أنا فرد",
        "signup.company": "نمثل شركة",
        "signup.insurer": "أنا شركة تأمين",
        "signup.individualDesc": "نلقى ونقارن تأمين ليا ولا لعيلتي",
        "signup.companyDesc": "نلقى تغطية للموظفين متاعي",
        "signup.insurerDesc": "نهبط العروض متاعي ونوصل لحرفاء جدد",
        "signup.fullName": "الاسم الكامل",
        "signup.companyName": "اسم الشركة",
        "signup.industry": "النشاط",
        "signup.employees": "عدد الموظفين",
        "signup.confirmPassword": "أكد كلمة السر",
        "signup.createMyAccount": "اعمل حسابي",
        "signup.createCompany": "اعمل حساب شركة",
        "signup.apply": "قدّم مطلب إدراج",
        "signup.creating": "قاعدين نعملو الحساب...",
        "signup.submitting": "قاعدين نبعثو...",
        "signup.already": "عندك حساب قبل؟",
        "signup.signIn": "ادخل",
        "platform.signOut": "تسجيل خروج",
        "platform.profile": "هاتلي بروفيل التأمين متاعي",
        "platform.search": "قلّب على تغطية ولا شركة ولا ميزة",
        "platform.reset": "صفّر الفلاتر",
        "platform.newChat": "محادثة جديدة",
        "platform.assistant": "مساعد InsurAI",
        "platform.ready": "جاهز يعاونك",
        "platform.typeMessage": "اكتب رسالتك",
        "chat.signOut": "تسجيل خروج",
        "chat.newChat": "محادثة جديدة",
        "chat.back": "ارجع للعروض",
        "chat.opening": "أهلا! أنا هنا باش نعاونك تلقى التأمين المناسب. قولي شنوة تحب تأمّن اليوم؟",
        "chat.error.unexpected": "صار مشكل غير متوقع وقت الاتصال بالمساعد.",
        "chat.aria.back": "ارجع للعروض",
        "chat.aria.send": "ابعث الرسالة",
        "chat.quick.health.label": "باقات الصحة",
        "chat.quick.health.message": "هبطلي باقات الصحة من RealAssurance",
        "chat.quick.auto.label": "تصنيف السيارات",
        "chat.quick.auto.message": "في تصنيف Auto، شنوة الأفضل نختار؟",
        "chat.quick.family.label": "تغطية العائلة",
        "chat.quick.family.message": "عندي قرض سيارة وعائلة، شنوّة التأمين اللي لازم نقدّمو؟",
        "chat.quick.best.label": "أفضل اختيار",
        "chat.quick.best.message": "قلّب في كل التصنيفات وكل الوكالات وبعد اقترحلي أفضل توصية.",
        "footer.tagline": "منصة تونسية باش تختار التأمين بسهولة.",
        "footer.product": "المنتج",
        "footer.company": "الشركة",
        "footer.legal": "قانوني",
        "footer.made": "مصنوع في تونس",
        "footer.rights": "كل الحقوق محفوظة.",
    },
}

const languageOrder: LanguageCode[] = ["en", "fr", "tn"]

const I18nContext = createContext<I18nContextValue | null>(null)

function getInitialLanguage(): LanguageCode {
    if (typeof window === "undefined") {
        return "en"
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "fr" || stored === "tn") {
        return stored
    }

    return "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage)

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        window.localStorage.setItem(STORAGE_KEY, language)

        const html = window.document.documentElement
        html.lang = language === "tn" ? "ar-TN" : language
        html.dir = language === "tn" ? "rtl" : "ltr"
    }, [language])

    const value = useMemo<I18nContextValue>(() => {
        return {
            language,
            setLanguage,
            cycleLanguage: () => {
                const currentIndex = languageOrder.indexOf(language)
                const nextIndex = (currentIndex + 1) % languageOrder.length
                setLanguage(languageOrder[nextIndex])
            },
            t: (key: string, fallback?: string) => {
                return translations[language][key] ?? translations.en[key] ?? fallback ?? key
            },
        }
    }, [language])

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
    const context = useContext(I18nContext)

    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider")
    }

    return context
}
