export type EmergencyInfo = {
  police: string;
  ambulance: string;
  fire: string;
  note?: string;
};

/** National emergency numbers. Default is 112 where the EU number is standard. */
const BY_COUNTRY: Record<string, EmergencyInfo> = {
  US: { police: "911", ambulance: "911", fire: "911" },
  CA: { police: "911", ambulance: "911", fire: "911" },
  MX: { police: "911", ambulance: "911", fire: "911" },
  GB: { police: "999", ambulance: "999", fire: "999", note: "112 also works" },
  IE: { police: "999", ambulance: "999", fire: "999", note: "112 also works" },
  AU: { police: "000", ambulance: "000", fire: "000" },
  NZ: { police: "111", ambulance: "111", fire: "111" },
  ZA: { police: "10111", ambulance: "10177", fire: "10111", note: "112 from mobile" },
  IN: { police: "112", ambulance: "112", fire: "112" },
  JP: { police: "110", ambulance: "119", fire: "119" },
  KR: { police: "112", ambulance: "119", fire: "119" },
  CN: { police: "110", ambulance: "120", fire: "119" },
  HK: { police: "999", ambulance: "999", fire: "999" },
  TW: { police: "110", ambulance: "119", fire: "119" },
  SG: { police: "999", ambulance: "995", fire: "995" },
  MY: { police: "999", ambulance: "999", fire: "999" },
  TH: { police: "191", ambulance: "1669", fire: "199" },
  VN: { police: "113", ambulance: "115", fire: "114" },
  ID: { police: "110", ambulance: "118", fire: "113" },
  PH: { police: "911", ambulance: "911", fire: "911" },
  BR: { police: "190", ambulance: "192", fire: "193" },
  AR: { police: "911", ambulance: "107", fire: "100" },
  CL: { police: "133", ambulance: "131", fire: "132" },
  CO: { police: "123", ambulance: "123", fire: "123" },
  PE: { police: "105", ambulance: "117", fire: "116" },
  EG: { police: "122", ambulance: "123", fire: "180" },
  NG: { police: "112", ambulance: "112", fire: "112" },
  KE: { police: "999", ambulance: "999", fire: "999", note: "112 from mobile" },
  GH: { police: "191", ambulance: "193", fire: "192" },
  TR: { police: "112", ambulance: "112", fire: "112" },
  SA: { police: "999", ambulance: "997", fire: "998" },
  AE: { police: "999", ambulance: "998", fire: "997" },
  IL: { police: "100", ambulance: "101", fire: "102" },
  RU: { police: "102", ambulance: "103", fire: "101", note: "112 from mobile" },
  UA: { police: "102", ambulance: "103", fire: "101", note: "112 from mobile" },
  PK: { police: "15", ambulance: "115", fire: "16" },
  BD: { police: "999", ambulance: "999", fire: "999" },
  NP: { police: "100", ambulance: "102", fire: "101" },
  MA: { police: "19", ambulance: "15", fire: "15", note: "112 from mobile" },
};

const EU_112: EmergencyInfo = {
  police: "112",
  ambulance: "112",
  fire: "112",
};

const EU = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI",
  "ES", "SE", "IS", "NO", "CH", "LI",
];
for (const code of EU) BY_COUNTRY[code] = EU_112;

export function emergencyForCountry(code: string | null | undefined): EmergencyInfo {
  if (!code) return { police: "112", ambulance: "112", fire: "112", note: "If 112 does not connect, try 911" };
  return BY_COUNTRY[code.toUpperCase()] ?? {
    police: "112",
    ambulance: "112",
    fire: "112",
    note: "If 112 does not connect, try the local police number",
  };
}

const PHRASES: Record<string, Record<string, string>> = {
  en: {
    emergency: "This is an emergency. Please send help immediately.",
    medical: "Someone is hurt and needs an ambulance.",
    fallen: "An elderly person has fallen and cannot get up.",
    accident: "There has been a car accident. People may be injured.",
    fuel: "A vehicle has run out of fuel and is stranded.",
    vehicle: "A vehicle has broken down and cannot move.",
    lost: "Someone is lost and needs directions or a pickup.",
    safety: "Someone feels unsafe and needs police.",
    water: "Someone needs drinking water urgently.",
    medicine: "Someone needs medication and cannot get it themselves.",
    shelter: "Someone needs a safe place to stay tonight.",
    food: "Someone needs food or water and cannot pay.",
    location: "The location coordinates are {lat}, {lng}.",
    pay: "They can pay for assistance.",
    nopay: "They cannot pay. Please help anyway.",
  },
  es: {
    emergency: "Esto es una emergencia. Por favor envíen ayuda de inmediato.",
    medical: "Alguien está herido y necesita una ambulancia.",
    fallen: "Una persona mayor se ha caído y no puede levantarse.",
    accident: "Ha habido un accidente de coche. Puede haber heridos.",
    fuel: "Un vehículo se ha quedado sin combustible.",
    vehicle: "Un vehículo se ha averiado y no puede moverse.",
    lost: "Alguien está perdido y necesita indicaciones.",
    safety: "Alguien no se siente seguro y necesita policía.",
    water: "Alguien necesita agua potable con urgencia.",
    medicine: "Alguien necesita medicación y no puede conseguirla.",
    shelter: "Alguien necesita un lugar seguro para esta noche.",
    food: "Alguien necesita comida o agua y no puede pagar.",
    location: "Las coordenadas son {lat}, {lng}.",
    pay: "Puede pagar la asistencia.",
    nopay: "No puede pagar. Por favor ayuden de todos modos.",
  },
  fr: {
    emergency: "C'est une urgence. Envoyez de l'aide immédiatement.",
    medical: "Quelqu'un est blessé et a besoin d'une ambulance.",
    fallen: "Une personne âgée est tombée et ne peut pas se relever.",
    accident: "Il y a eu un accident de voiture. Des personnes peuvent être blessées.",
    fuel: "Un véhicule est en panne d'essence.",
    vehicle: "Un véhicule est en panne et ne peut pas bouger.",
    lost: "Quelqu'un est perdu et a besoin d'indications.",
    safety: "Quelqu'un ne se sent pas en sécurité et a besoin de la police.",
    water: "Quelqu'un a besoin d'eau potable d'urgence.",
    medicine: "Quelqu'un a besoin de médicaments et ne peut pas les obtenir.",
    shelter: "Quelqu'un a besoin d'un abri sûr pour cette nuit.",
    food: "Quelqu'un a besoin de nourriture et ne peut pas payer.",
    location: "Les coordonnées sont {lat}, {lng}.",
    pay: "La personne peut payer l'aide.",
    nopay: "La personne ne peut pas payer. Aidez quand même.",
  },
  pt: {
    emergency: "Isto é uma emergência. Enviem ajuda imediatamente.",
    medical: "Alguém está ferido e precisa de uma ambulância.",
    fallen: "Uma pessoa idosa caiu e não consegue se levantar.",
    accident: "Houve um acidente de carro. Pode haver feridos.",
    fuel: "Um veículo ficou sem combustível.",
    vehicle: "Um veículo avariou e não consegue se mover.",
    lost: "Alguém está perdido e precisa de indicações.",
    safety: "Alguém não se sente seguro e precisa da polícia.",
    water: "Alguém precisa de água potável com urgência.",
    medicine: "Alguém precisa de medicamento e não consegue obter.",
    shelter: "Alguém precisa de um lugar seguro para esta noite.",
    food: "Alguém precisa de comida e não pode pagar.",
    location: "As coordenadas são {lat}, {lng}.",
    pay: "A pessoa pode pagar pela ajuda.",
    nopay: "A pessoa não pode pagar. Ajudem mesmo assim.",
  },
  de: {
    emergency: "Das ist ein Notfall. Bitte schicken Sie sofort Hilfe.",
    medical: "Jemand ist verletzt und braucht einen Krankenwagen.",
    fallen: "Eine ältere Person ist gestürzt und kann nicht aufstehen.",
    accident: "Es gab einen Autounfall. Es könnte Verletzte geben.",
    fuel: "Ein Fahrzeug hat kein Benzin mehr.",
    vehicle: "Ein Fahrzeug ist liegengeblieben.",
    lost: "Jemand hat sich verlaufen und braucht Hilfe.",
    safety: "Jemand fühlt sich unsicher und braucht die Polizei.",
    water: "Jemand braucht dringend Trinkwasser.",
    medicine: "Jemand braucht Medikamente und kann sie nicht holen.",
    shelter: "Jemand braucht heute Nacht eine sichere Unterkunft.",
    food: "Jemand braucht Essen und kann nicht bezahlen.",
    location: "Die Koordinaten sind {lat}, {lng}.",
    pay: "Die Person kann für Hilfe bezahlen.",
    nopay: "Die Person kann nicht bezahlen. Bitte trotzdem helfen.",
  },
  it: {
    emergency: "Questa è un'emergenza. Mandate aiuto immediatamente.",
    medical: "Qualcuno è ferito e ha bisogno di un'ambulanza.",
    fallen: "Una persona anziana è caduta e non riesce ad alzarsi.",
    accident: "C'è stato un incidente stradale. Potrebbero esserci feriti.",
    fuel: "Un veicolo è rimasto senza carburante.",
    vehicle: "Un veicolo si è rotto e non può muoversi.",
    lost: "Qualcuno si è perso e ha bisogno di indicazioni.",
    safety: "Qualcuno non si sente al sicuro e ha bisogno della polizia.",
    water: "Qualcuno ha bisogno urgente di acqua potabile.",
    medicine: "Qualcuno ha bisogno di medicine e non può prenderle.",
    shelter: "Qualcuno ha bisogno di un posto sicuro per stanotte.",
    food: "Qualcuno ha bisogno di cibo e non può pagare.",
    location: "Le coordinate sono {lat}, {lng}.",
    pay: "Può pagare per l'assistenza.",
    nopay: "Non può pagare. Aiutate comunque.",
  },
  ar: {
    emergency: "هذه حالة طارئة. أرسلوا المساعدة فوراً.",
    medical: "هناك مصاب ويحتاج إلى سيارة إسعاف.",
    fallen: "سقط شخص مسن ولا يستطيع النهوض.",
    accident: "وقع حادث سيارة. قد يكون هناك مصابون.",
    fuel: "نفد الوقود من مركبة وهي عالقة.",
    vehicle: "تعطلت مركبة ولا تستطيع الحركة.",
    lost: "شخص تائه ويحتاج إلى توجيه.",
    safety: "شخص يشعر بعدم الأمان ويحتاج إلى الشرطة.",
    water: "شخص يحتاج إلى مياه شرب بشكل عاجل.",
    medicine: "شخص يحتاج إلى دواء ولا يستطيع الحصول عليه.",
    shelter: "شخص يحتاج إلى مكان آمن لهذه الليلة.",
    food: "شخص يحتاج إلى طعام ولا يستطيع الدفع.",
    location: "الإحداثيات هي {lat}، {lng}.",
    pay: "يمكنه دفع مقابل المساعدة.",
    nopay: "لا يستطيع الدفع. الرجاء المساعدة على أي حال.",
  },
  zh: {
    emergency: "这是紧急情况。请立即派人帮助。",
    medical: "有人受伤，需要救护车。",
    fallen: "一位老人摔倒了，无法自行站起来。",
    accident: "发生了车祸，可能有人受伤。",
    fuel: "车辆没油了，困在路上。",
    vehicle: "车辆抛锚，无法移动。",
    lost: "有人迷路了，需要指路或接送。",
    safety: "有人感到不安全，需要警察。",
    water: "有人急需饮用水。",
    medicine: "有人需要药物，自己无法取得。",
    shelter: "有人今晚需要一个安全的住处。",
    food: "有人需要食物，无法支付。",
    location: "坐标是 {lat}, {lng}。",
    pay: "对方可以支付协助费用。",
    nopay: "对方无法支付。请仍然提供帮助。",
  },
  ja: {
    emergency: "緊急です。すぐに助けを送ってください。",
    medical: "けが人がいて救急車が必要です。",
    fallen: "高齢の方が転倒して起き上がれません。",
    accident: "交通事故がありました。けが人がいるかもしれません。",
    fuel: "車の燃料がなくて動けません。",
    vehicle: "車が故障して動けません。",
    lost: "道に迷っています。案内が必要です。",
    safety: "身の危険を感じています。警察が必要です。",
    water: "飲料水が緊急で必要です。",
    medicine: "薬が必要ですが自分では手に入れられません。",
    shelter: "今夜泊まれる安全な場所が必要です。",
    food: "食べ物が必要で、支払えません。",
    location: "座標は {lat}, {lng} です。",
    pay: "援助の費用を払えます。",
    nopay: "支払えません。それでも助けてください。",
  },
  ko: {
    emergency: "긴급 상황입니다. 즉시 도움을 보내주세요.",
    medical: "다친 사람이 있어 구급차가 필요합니다.",
    fallen: "어르신이 넘어지셔서 일어나시지 못합니다.",
    accident: "교통사고가 났습니다. 부상자가 있을 수 있습니다.",
    fuel: "차량 연료가 떨어져 멈춰 있습니다.",
    vehicle: "차량이 고장 나서 움직일 수 없습니다.",
    lost: "길을 잃었습니다. 안내가 필요합니다.",
    safety: "위험하다고 느껴 경찰이 필요합니다.",
    water: "식수가 급히 필요합니다.",
    medicine: "약이 필요하지만 직접 구할 수 없습니다.",
    shelter: "오늘 밤 머물 안전한 곳이 필요합니다.",
    food: "음식이 필요하고 비용을 낼 수 없습니다.",
    location: "좌표는 {lat}, {lng} 입니다.",
    pay: "도움을 받을 비용을 낼 수 있습니다.",
    nopay: "비용을 낼 수 없습니다. 그래도 도와주세요.",
  },
  hi: {
    emergency: "यह आपातकाल है। कृपया तुरंत मदद भेजें।",
    medical: "कोई घायल है और एम्बुलेंस चाहिए।",
    fallen: "एक बुजुर्ग गिर गए हैं और उठ नहीं पा रहे।",
    accident: "कार दुर्घटना हुई है। लोग घायल हो सकते हैं।",
    fuel: "वाहन का ईंधन खत्म हो गया है।",
    vehicle: "वाहन खराब हो गया है और चल नहीं रहा।",
    lost: "कोई रास्ता भटक गया है।",
    safety: "कोई असुरक्षित महसूस कर रहा है, पुलिस चाहिए।",
    water: "किसी को तुरंत पीने का पानी चाहिए।",
    medicine: "किसी को दवा चाहिए और वे खुद नहीं ले सकते।",
    shelter: "किसी को आज रात सुरक्षित जगह चाहिए।",
    food: "किसी को भोजन चाहिए और वे भुगतान नहीं कर सकते।",
    location: "निर्देशांक {lat}, {lng} हैं।",
    pay: "वे सहायता के लिए भुगतान कर सकते हैं।",
    nopay: "वे भुगतान नहीं कर सकते। फिर भी मदद करें।",
  },
  ru: {
    emergency: "Это чрезвычайная ситуация. Пришлите помощь немедленно.",
    medical: "Человек пострадал, нужна скорая.",
    fallen: "Пожилой человек упал и не может встать.",
    accident: "Произошло ДТП. Возможны пострадавшие.",
    fuel: "У машины закончилось топливо.",
    vehicle: "Машина сломалась и не может ехать.",
    lost: "Человек заблудился и нужна помощь.",
    safety: "Человеку небезопасно, нужна полиция.",
    water: "Срочно нужна питьевая вода.",
    medicine: "Нужны лекарства, сам человек достать не может.",
    shelter: "Нужно безопасное место на эту ночь.",
    food: "Нужна еда, заплатить не может.",
    location: "Координаты: {lat}, {lng}.",
    pay: "Может оплатить помощь.",
    nopay: "Оплатить не может. Пожалуйста, помогите всё равно.",
  },
  sw: {
    emergency: "Hii ni dharura. Tafadhali tuma msaada mara moja.",
    medical: "Kuna aliyejeruhiwa, anahitaji ambulensi.",
    fallen: "Mzee ameanguka na hawezi kusimama.",
    accident: "Kumekuwa na ajali ya gari. Huenda kuna waliojeruhiwa.",
    fuel: "Gari limeishiwa mafuta.",
    vehicle: "Gari limeharibika haliwezi kusogea.",
    lost: "Mtu amepotea na anahitaji mwelekeo.",
    safety: "Mtu hajisikii salama, anahitaji polisi.",
    water: "Mtu anahitaji maji ya kunywa haraka.",
    medicine: "Mtu anahitaji dawa na hawezi kujipatia.",
    shelter: "Mtu anahitaji mahali salama usiku huu.",
    food: "Mtu anahitaji chakula na hawezi kulipa.",
    location: "Kuratibu ni {lat}, {lng}.",
    pay: "Anaweza kulipia msaada.",
    nopay: "Hawezi kulipa. Tafadhali saidia hata hivyo.",
  },
};

const COUNTRY_LANG: Record<string, string> = {
  US: "en", CA: "en", GB: "en", AU: "en", NZ: "en", IE: "en",
  IN: "hi", PK: "hi", NG: "en", KE: "sw", ZA: "en", GH: "en",
  MX: "es", ES: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  FR: "fr", BE: "fr", SN: "fr",
  BR: "pt", PT: "pt",
  DE: "de", AT: "de", CH: "de",
  IT: "it",
  SA: "ar", AE: "ar", EG: "ar", MA: "ar",
  CN: "zh", TW: "zh", HK: "zh", SG: "en",
  JP: "ja",
  KR: "ko",
  RU: "ru",
  UA: "uk",
  TR: "tr",
  TH: "th",
  VN: "vi",
  ID: "id",
  NL: "nl",
  PL: "pl",
};

export function localLanguageForCountry(code: string | null | undefined): string {
  if (!code) return "en";
  return COUNTRY_LANG[code.toUpperCase()] ?? "en";
}

export function phrase(
  lang: string,
  key: string,
  vars?: Record<string, string>,
): string {
  const table = PHRASES[lang] ?? PHRASES.en;
  let text = table[key] ?? PHRASES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

const TYPE_KEYS: Record<string, string> = {
  medical: "medical",
  accident: "accident",
  fuel: "fuel",
  vehicle: "vehicle",
  lost: "lost",
  safety: "safety",
  water: "water",
  medicine: "medicine",
  shelter: "shelter",
  food: "food",
  stranded: "emergency",
};

export function buildCallScript(opts: {
  helpType: string;
  lat: number;
  lng: number;
  canPay: boolean;
  countryCode: string | null;
}): { localLang: string; lines: { key: string; local: string; english: string }[] } {
  const localLang = localLanguageForCountry(opts.countryCode);
  const typeKey = TYPE_KEYS[opts.helpType] ?? "emergency";
  const keys = [typeKey, "location", opts.canPay ? "pay" : "nopay"] as const;
  const vars = { lat: opts.lat.toFixed(5), lng: opts.lng.toFixed(5) };
  return {
    localLang,
    lines: keys.map((key) => ({
      key,
      local: phrase(localLang, key, vars),
      english: phrase("en", key, vars),
    })),
  };
}
