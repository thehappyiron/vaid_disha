import { normalizeSlip } from '../hospitalService';
/**
 * Mock Chat Provider with Multilingual Keyword Intent Matching
 *
 * Accurately handles English, Hindi, and Marathi queries.
 * Integrates liveStore status and current slip data to deliver accurate,
 * real-time responses with actionable deep links.
 */

import type { ChatProvider } from './provider';
import type { ChatRequest, ChatResponse, ChatAction } from './types';
import { getPatientLiveDetails } from '../liveStore';
import type { Slip } from '../../types';

function getStoredSlip(): Slip | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vd-latest-slip');
    if (!raw) return null;
    return normalizeSlip(JSON.parse(raw) as Slip);
  } catch {
    return null;
  }
}

export class MockChatProvider implements ChatProvider {
  public async sendMessage(req: ChatRequest): Promise<ChatResponse> {
    // Simulate natural AI thinking delay
    await new Promise((res) => setTimeout(res, 450));

    const text = req.message.toLowerCase().trim();
    const lang = (req.language || 'en').toLowerCase().slice(0, 2);
    const slip = getStoredSlip();
    const hasWheelchair =
      req.context.accessibilityNeeds?.includes('wheelchair') ||
      req.context.accessibilityNeeds?.includes('walking_difficulty') ||
      slip?.accessibilityNeeds?.includes('wheelchair') ||
      slip?.accessibilityNeeds?.includes('walking_difficulty');

    // Fetch live status if slip exists
    let liveWait = slip?.estimatedWait ?? 15;
    let livePeopleAhead = slip?.peopleAhead ?? 1;
    let liveToken = slip?.token ?? 'OPD-101';
    let rawRoom = slip?.roomNumber || slip?.department?.roomNumbers?.[0] || '';
    let roomNum = rawRoom
      ? rawRoom.toLowerCase().startsWith('room')
        ? rawRoom
        : `Room ${rawRoom}`
      : '';
    const deptName = slip?.department?.name || 'General Medicine';

    if (slip?.token) {
      try {
        const live = await getPatientLiveDetails(
          slip.token,
          slip.department?.id
        );
        if (live.estimatedWaitMinutes !== undefined) {
          liveWait = live.estimatedWaitMinutes;
          livePeopleAhead = live.peopleAhead;
        }
        if (live.department?.roomNumber) {
          rawRoom = live.department.roomNumber;
          roomNum = rawRoom.toLowerCase().startsWith('room')
            ? rawRoom
            : `Room ${rawRoom}`;
        }
      } catch {
        // use fallback slip values
      }
    }

    // ─── 1. INTENT: WHERE IS MY ROOM ───────────────────────────────────────────
    const isRoomQuery =
      text.includes('room') ||
      text.includes('where') ||
      text.includes('where is') ||
      text.includes('cabin') ||
      text.includes('find') ||
      text.includes('direction') ||
      text.includes('reach') ||
      text.includes('कमरा') ||
      text.includes('खोली') ||
      text.includes('कहाँ') ||
      text.includes('कुठे') ||
      text.includes('मार्ग') ||
      text.includes('रस्ता') ||
      text.includes('कक्षा');

    if (isRoomQuery) {
      if (slip) {
        const targetDesc = roomNum ? `${roomNum} (${deptName})` : deptName;
        if (lang === 'hi') {
          return {
            text: `आपका परामर्श ${targetDesc} में है। कृपया सीधे पहुँचने के लिए 'मार्गदर्शन देखें' बटन दबाएं।`,
            language: 'hi',
            actions: [
              {
                label: 'मार्गदर्शन देखें (कदम-दर-कदम)',
                route: `/patient/guidance/${slip.id}`,
              },
              { label: 'मेरी पर्ची देखें', route: `/patient/slip/${slip.id}` },
            ],
            suggestedReplies: [
              'प्रतीक्षा समय कितना है?',
              'निकटतम शौचालय कहाँ है?',
            ],
          };
        }
        if (lang === 'mr') {
          return {
            text: `तुमचे तपासणी कक्ष ${targetDesc} येथे आहे. थेट पोहोचण्यासाठी खालील 'मार्गदर्शन सुरू करा' बटणावर टॅप करा.`,
            language: 'mr',
            actions: [
              {
                label: 'मार्गदर्शन सुरू करा',
                route: `/patient/guidance/${slip.id}`,
              },
              { label: 'माझी पावती दाखवा', route: `/patient/slip/${slip.id}` },
            ],
            suggestedReplies: ['किती वेळ लागेल?', 'जवळचे प्रसाधनगृह कुठे आहे?'],
          };
        }
        return {
          text: `Your consultation is scheduled in ${targetDesc}. Tap below for turn-by-turn guidance or to view your visit slip.`,
          language: 'en',
          actions: [
            {
              label: 'Help me find the way',
              route: `/patient/guidance/${slip.id}`,
            },
            { label: 'Show my slip', route: `/patient/slip/${slip.id}` },
          ],
          suggestedReplies: [
            'How long is the wait?',
            'Nearest washroom',
            'My reports',
          ],
        };
      } else {
        const actions: ChatAction[] = [
          { label: 'Register Visit & Get Slip', route: '/patient/visit' },
        ];
        if (lang === 'hi') {
          return {
            text: 'आपने अभी तक विज़िट पर्ची नहीं बनाई है। कृपया कमरा नंबर प्राप्त करने के लिए अपनी विज़िट दर्ज करें।',
            language: 'hi',
            actions,
            suggestedReplies: ['विज़िट शुरू करें', 'मदद चाहिए'],
          };
        }
        if (lang === 'mr') {
          return {
            text: 'आपण अद्याप भेट नोंदवलेली नाही. कृपया खोली क्रमांक मिळवण्यासाठी आपली भेट नोंदवा.',
            language: 'mr',
            actions,
            suggestedReplies: ['नोंदणी करा', 'मदत हवी आहे'],
          };
        }
        return {
          text: "You haven't generated a visit slip yet. Please register your visit to receive your assigned room number and live queue token.",
          language: 'en',
          actions,
          suggestedReplies: [
            'Register visit',
            'Nearest washroom',
            'I need help',
          ],
        };
      }
    }

    // ─── 2. INTENT: WASHROOM ───────────────────────────────────────────────────
    const isWashroomQuery =
      text.includes('washroom') ||
      text.includes('toilet') ||
      text.includes('restroom') ||
      text.includes('bathroom') ||
      text.includes('latrine') ||
      text.includes('शौचालय') ||
      text.includes('प्रसाधनगृह') ||
      text.includes('टॉयलेट');

    if (isWashroomQuery) {
      const actions: ChatAction[] = [
        {
          label: 'Nearest washroom',
          route: '/patient/facilities?filter=washroom',
        },
      ];

      if (hasWheelchair) {
        if (lang === 'hi') {
          return {
            text: 'सुलभ (Accessible) शौचालय भूतल (Ground Floor) पर पिलर F0-W1 के पास स्थित है, जिसमें रैंप और चौड़े दरवाजे उपलब्ध हैं।',
            language: 'hi',
            actions,
            suggestedReplies: ['मुझे रास्ता दिखाएं', 'कमरा कहाँ है?'],
          };
        }
        if (lang === 'mr') {
          return {
            text: 'सुलभ (Accessible) प्रसाधनगृह तळमजल्यावर पिलर F0-W1 जवळ उपलब्ध आहे, जेथे व्हीलचेअर रॅम्प व ग्रॅब बार्स आहेत.',
            language: 'mr',
            actions,
            suggestedReplies: ['मला मार्ग दाखवा', 'माझा कक्ष कुठे आहे?'],
          };
        }
        return {
          text: 'The nearest accessible wheelchair-friendly washroom is located on the Ground Floor near Pillar F0-W1, equipped with support grab bars and wide door access.',
          language: 'en',
          actions,
          suggestedReplies: ['Take me there', 'Where is my room?'],
        };
      }

      if (lang === 'hi') {
        return {
          text: 'निकटतम शौचालय भूतल पर पिलर F0-W1 के पास तथा पहली मंजिल पर वेस्ट कॉरिडोर के पास स्थित हैं।',
          language: 'hi',
          actions,
          suggestedReplies: ['कमरा कहाँ है?', 'प्रतीक्षा समय'],
        };
      }
      if (lang === 'mr') {
        return {
          text: 'जवळचे प्रसाधनगृह तळमजल्यावर पिलर F0-W1 जवळ आणि पहिल्या मजल्यावर वेस्ट कॉरिडॉरजवळ उपलब्ध आहे.',
          language: 'mr',
          actions,
          suggestedReplies: ['माझा कक्ष कुठे आहे?', 'प्रतीक्षा वेळ'],
        };
      }
      return {
        text: 'The nearest washrooms are located on the Ground Floor near Pillar F0-W1, and on Floor 1 next to the West Corridor.',
        language: 'en',
        actions,
        suggestedReplies: ['Where is my room?', 'How long is the wait?'],
      };
    }

    // ─── 3. INTENT: WAIT TIME / QUEUE ──────────────────────────────────────────
    const isWaitQuery =
      text.includes('wait') ||
      text.includes('time') ||
      text.includes('queue') ||
      text.includes('how long') ||
      text.includes('token') ||
      text.includes('turn') ||
      text.includes('delay') ||
      text.includes('प्रतीक्षा') ||
      text.includes('देर') ||
      text.includes('समय') ||
      text.includes('नंबर') ||
      text.includes('टोकन') ||
      text.includes('किती वेळ') ||
      text.includes('कधी येणार');

    if (isWaitQuery) {
      if (slip) {
        const actions: ChatAction[] = [
          { label: 'Show live queue tracker', route: '/patient/live' },
          { label: 'Show my slip', route: `/patient/slip/${slip.id}` },
        ];
        if (lang === 'hi') {
          return {
            text: `आपका टोकन #${liveToken} है। अनुमानित प्रतीक्षा समय लगभग ${liveWait} मिनट है, और आपसे पहले ${livePeopleAhead} मरीज़ कतार में हैं।`,
            language: 'hi',
            actions,
            suggestedReplies: ['कमरा कहाँ है?', 'शौचालय कहाँ है?'],
          };
        }
        if (lang === 'mr') {
          return {
            text: `आपला टोकन क्र. #${liveToken} आहे. अंदाजे प्रतीक्षा वेळ ${liveWait} मिनिटे असून आपल्या पुढे ${livePeopleAhead} रुग्ण आहेत.`,
            language: 'mr',
            actions,
            suggestedReplies: ['माझा कक्ष कुठे आहे?', 'जवळचे प्रसाधनगृह'],
          };
        }
        return {
          text: `Your token is #${liveToken}. The estimated wait time is approximately ${liveWait} minutes with ${livePeopleAhead} patient(s) ahead of you in line.`,
          language: 'en',
          actions,
          suggestedReplies: [
            'Where is my room?',
            'Nearest washroom',
            'My reports',
          ],
        };
      } else {
        if (lang === 'hi') {
          return {
            text: 'सामान्य ओपीडी में औसत प्रतीक्षा समय 15 से 20 मिनट है। अपनी व्यक्तिगत कतार स्थिति जानने के लिए विज़िट पर्ची बनाएं।',
            language: 'hi',
            actions: [{ label: 'पर्ची बनाएं', route: '/patient/visit' }],
            suggestedReplies: ['पर्ची बनाएं', 'शौचालय कहाँ है?'],
          };
        }
        if (lang === 'mr') {
          return {
            text: 'सर्वसाधारण ओपीडीमध्ये सरासरी प्रतीक्षा वेळ १५ ते २० मिनिटे आहे. अचूक माहितीसाठी भेट नोंदवा.',
            language: 'mr',
            actions: [{ label: 'भेट नोंदवा', route: '/patient/visit' }],
            suggestedReplies: ['भेट नोंदवा', 'प्रसाधनगृह कुठे आहे?'],
          };
        }
        return {
          text: 'Average wait time across OPD departments is currently 15–20 minutes. Register your visit to track your personal live queue position.',
          language: 'en',
          actions: [{ label: 'Register visit', route: '/patient/visit' }],
          suggestedReplies: ['Register visit', 'Nearest washroom'],
        };
      }
    }

    // ─── 4. INTENT: HELP / EMERGENCY ───────────────────────────────────────────
    const isEmergencyQuery =
      text.includes('emergency') ||
      text.includes('urgent') ||
      text.includes('pain') ||
      text.includes('chest') ||
      text.includes('bleeding') ||
      text.includes('breathe') ||
      text.includes('breathing') ||
      text.includes('faint') ||
      text.includes('help') ||
      text.includes('fell') ||
      text.includes('आपात') ||
      text.includes('मदद') ||
      text.includes('सहायता') ||
      text.includes('आपत्कालीन') ||
      text.includes('छातीत दुखणे') ||
      text.includes('श्वास');

    if (isEmergencyQuery) {
      const actions: ChatAction[] = [
        { label: 'Alert staff / emergency', route: '/patient/emergency' },
      ];
      if (lang === 'hi') {
        return {
          text: 'यदि आपको या किसी मरीज़ को गंभीर तकलीफ, सीने में दर्द या सांस लेने में परेशानी है, तो कृपया तुरंत नीचे दिया गया आपातकालीन बटन दबाएं ताकि मेडिकल स्टाफ सहायता के लिए पहुँच सके।',
          language: 'hi',
          actions,
          suggestedReplies: ['आपातकालीन सहायता', 'कमरा कहाँ है?'],
        };
      }
      if (lang === 'mr') {
        return {
          text: 'जर आपल्याला तातडीने वैद्यकीय मदतीची गरज असेल किंवा तीव्र त्रास होत असेल, तर कृपया लगेच खालील आपत्कालीन बटण दाबा.',
          language: 'mr',
          actions,
          suggestedReplies: ['आपत्कालीन मदत', 'कक्ष शोधा'],
        };
      }
      return {
        text: 'For immediate medical emergencies or severe symptoms (e.g. chest pain, shortness of breath, fainting), please press the Emergency button right away to alert hospital rapid response staff.',
        language: 'en',
        actions,
        suggestedReplies: ['Alert staff / emergency', 'Where is my room?'],
      };
    }

    // ─── 5. INTENT: LAB REPORTS ────────────────────────────────────────────────
    const isReportsQuery =
      text.includes('report') ||
      text.includes('test') ||
      text.includes('lab') ||
      text.includes('blood') ||
      text.includes('cbc') ||
      text.includes('x-ray') ||
      text.includes('result') ||
      text.includes('रिपोर्ट') ||
      text.includes('जांच') ||
      text.includes('चाचणी') ||
      text.includes('निकाल') ||
      text.includes('रक्त');

    if (isReportsQuery) {
      const actions: ChatAction[] = [
        { label: 'My reports', route: '/patient/reports' },
      ];
      if (lang === 'hi') {
        return {
          text: 'आप अपनी लैब रिपोर्ट देख सकते हैं, उनका ऑडियो सारांश सुन सकते हैं और पीडीएफ डाउनलोड कर सकते हैं।',
          language: 'hi',
          actions,
          suggestedReplies: ['रिपोर्ट देखें', 'कमरा कहाँ है?'],
        };
      }
      if (lang === 'mr') {
        return {
          text: 'आपण आपले लॅब रिपोर्ट्स पाहू शकता, ऑडिओ सारांश ऐकू शकता आणि पीडीएफ डाउनलोड करू शकता.',
          language: 'mr',
          actions,
          suggestedReplies: ['रिपोर्ट्स पहा', 'माझा कक्ष कुठे आहे?'],
        };
      }
      return {
        text: 'You can view, read aloud, and download your diagnostic lab reports directly from the Lab Reports section.',
        language: 'en',
        actions,
        suggestedReplies: ['My reports', 'How long is the wait?'],
      };
    }

    // ─── 6. INTENT: HELLO / THANKS ─────────────────────────────────────────────
    const isGreeting =
      text.includes('hello') ||
      text.includes('hi') ||
      text.includes('hey') ||
      text.includes('namaste') ||
      text.includes('morning') ||
      text.includes('thank') ||
      text.includes('thanks') ||
      text.includes('नमस्ते') ||
      text.includes('नमस्कार') ||
      text.includes('धन्यवाद') ||
      text.includes('शुक्रिया');

    if (isGreeting) {
      if (lang === 'hi') {
        return {
          text: 'नमस्ते! मैं आपका वैद्य दिशा सहायक हूँ। मैं आपको अस्पताल में कमरा खोजने, प्रतीक्षा समय जांचने और रिपोर्ट देखने में सहायता कर सकता हूँ।',
          language: 'hi',
          actions: [
            {
              label: 'कमरा कहाँ है?',
              route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
            },
            {
              label: 'निकटतम शौचालय',
              route: '/patient/facilities?filter=washroom',
            },
          ],
          suggestedReplies: [
            'कमरा कहाँ है?',
            'प्रतीक्षा समय',
            'शौचालय कहाँ है?',
            'मेरी रिपोर्ट',
          ],
        };
      }
      if (lang === 'mr') {
        return {
          text: 'नमस्कार! मी आपला वैद्य दिशा सहाय्यक आहे. मी आपल्याला रुग्णालयातील कक्ष शोधणे, प्रतीक्षा वेळ तपासणे आणि रिपोर्ट पाहण्यास मदत करू शकतो.',
          language: 'mr',
          actions: [
            {
              label: 'माझा कक्ष कुठे आहे?',
              route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
            },
            {
              label: 'जवळचे प्रसाधनगृह',
              route: '/patient/facilities?filter=washroom',
            },
          ],
          suggestedReplies: [
            'माझा कक्ष कुठे आहे?',
            'प्रतीक्षा वेळ किती?',
            'प्रसाधनगृह कुठे आहे?',
          ],
        };
      }
      return {
        text: 'Hello! I am your Vaid Disha hospital assistant. How can I assist you today? You can ask about your room, wait times, washrooms, or lab reports.',
        language: 'en',
        actions: [
          {
            label: 'Where is my room?',
            route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
          },
          {
            label: 'Nearest washroom',
            route: '/patient/facilities?filter=washroom',
          },
        ],
        suggestedReplies: [
          'Where is my room?',
          'Nearest washroom',
          'How long is the wait?',
          'My reports',
        ],
      };
    }

    // ─── 7. POLITE FALLBACK ────────────────────────────────────────────────────
    if (lang === 'hi') {
      return {
        text: 'मैं अस्पताल में रास्ता खोजने, सुविधाओं की जानकारी, कतार का समय और लैब रिपोर्ट देखने में आपकी सहायता कर सकता हूँ। कृपया नीचे दिए गए विकल्पों में से चुनें या स्पष्ट प्रश्न पूछें।',
        language: 'hi',
        actions: [
          {
            label: 'कमरा कहाँ है?',
            route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
          },
          {
            label: 'निकटतम शौचालय',
            route: '/patient/facilities?filter=washroom',
          },
          { label: 'मेरी रिपोर्ट', route: '/patient/reports' },
        ],
        suggestedReplies: [
          'कमरा कहाँ है?',
          'शौचालय कहाँ है?',
          'प्रतीक्षा समय',
          'मदद चाहिए',
        ],
      };
    }
    if (lang === 'mr') {
      return {
        text: 'मी रुग्णालयातील मार्ग, सुविधा, प्रतीक्षा वेळ आणि लॅब रिपोर्ट पाहण्यास मदत करू शकतो. खालीलपैकी पर्याय निवडा किंवा प्रश्न विचारा.',
        language: 'mr',
        actions: [
          {
            label: 'माझा कक्ष कुठे आहे?',
            route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
          },
          {
            label: 'जवळचे प्रसाधनगृह',
            route: '/patient/facilities?filter=washroom',
          },
          { label: 'माझे रिपोर्ट्स', route: '/patient/reports' },
        ],
        suggestedReplies: [
          'माझा कक्ष कुठे आहे?',
          'प्रसाधनगृह कुठे आहे?',
          'प्रतीक्षा वेळ किती?',
        ],
      };
    }

    return {
      text: "I'm here to help you navigate the hospital, find facilities, check wait times, and view lab reports. Please select a quick action below or type your question.",
      language: 'en',
      actions: [
        {
          label: 'Help me find the way',
          route: slip ? `/patient/guidance/${slip.id}` : '/patient/visit',
        },
        {
          label: 'Nearest washroom',
          route: '/patient/facilities?filter=washroom',
        },
        { label: 'My reports', route: '/patient/reports' },
      ],
      suggestedReplies: [
        'Where is my room?',
        'Nearest washroom',
        'How long is the wait?',
        'I need help',
      ],
    };
  }
}
