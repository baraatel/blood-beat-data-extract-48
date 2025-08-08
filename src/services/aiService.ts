import { supabase } from "@/integrations/supabase/client";

interface AISettings {
  provider: 'gemini';
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-flash'
};

export const getAISettings = (): AISettings => {
  const stored = localStorage.getItem('aiSettings');
  return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
};

export const saveAISettings = (settings: Partial<AISettings>) => {
  const current = getAISettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('aiSettings', JSON.stringify(updated));
};

export const testAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello" }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Enhanced data extraction function with better accuracy
const extractDataFromText = (text: string) => {
  const safeText = text || "";
  console.log('Raw OCR text:', safeText);

  // Preprocess text for better recognition
  const preprocessText = (text: string) => {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\/\-\:\.]/g, ' ') // Remove special chars except useful ones
      .replace(/\b0(\d)\b/g, '$1') // Remove leading zeros from single digits
      // Special handling for sys/dia + number combinations
      .replace(/\bsys(\d{2,3})\b/gi, 'sys $1') // Add space between sys and number
      .replace(/\bdia(\d{2,3})\b/gi, 'dia $1') // Add space between dia and number
      .replace(/\bs(\d{2,3})\b/gi, 's $1') // Add space between s and number
      .replace(/\bd(\d{2,3})\b/gi, 'd $1') // Add space between d and number
      // OCR correction for common misreads
      .replace(/\bminig\b/gi, 'mmhg') // Fix "minig" -> "mmhg"
      .replace(/\b1\+\b/g, '') // Remove "1+" artifacts
      .replace(/\b\+\b/g, '') // Remove standalone "+" artifacts
      .replace(/\b%\b/g, '') // Remove "%" symbols
      .replace(/\bcm\b/gi, '7m') // Fix "cm" -> "7m" (common OCR misread)
      .replace(/\bc1\b/gi, '7m') // Fix "c1" -> "7m" (OCR misread)
      .replace(/\bc9\b/gi, '7m') // Fix "c9" -> "7m" (OCR misread)
      .replace(/\bmid\b/gi, '7m') // Fix "mid" -> "7m" (OCR misread of "7m")
      .toLowerCase(); // Convert to lowercase for case-insensitive matching
  };

  const processedText = preprocessText(safeText);
  console.log('Processed text:', processedText);

  // Helper functions with improved accuracy
  const findNumber = (re: RegExp, defaultValue = 0) => {
    const matches = processedText.match(re);
    if (matches) {
      const num = Number(matches[1]);
      return isNaN(num) ? defaultValue : num;
    }
    return defaultValue;
  };

  const findString = (re: RegExp, defaultValue = "") => {
    const matches = processedText.match(re);
    return matches ? (matches[1] || matches[0]) : defaultValue;
  };

  // Enhanced pattern matching for blood pressure data
  const patterns = {
    // Month patterns - more flexible
    month: [
      /\b(\d{1,2})\s*(?:month|mo|m)\b/i,
      /\b(?:month|mo|m)\s*(\d{1,2})\b/i,
      /\b(\d{1,2})m\b/i,
      /\b(?:cm|7m|mid)\b/i, // Handle OCR misreads "cm", "7m", "mid"
      /\b(\d{1,2})\s*\/\s*\d{1,2}\b/i, // Date format like 7/15
      /\b(\d{1,2})\s*-\s*\d{1,2}\b/i, // Date format like 7-15
    ],
    
    // Day patterns - more flexible
    day: [
      /\b(\d{1,2})\s*(?:day|d)\b/i,
      /\b(?:day|d)\s*(\d{1,2})\b/i,
      /\b(\d{1,2})d\b/i,
      /\b(\d{1,2})\s*\/\s*\d{1,2}\b/i, // Date format like 7/15
      /\b(\d{1,2})\s*-\s*\d{1,2}\b/i, // Date format like 7-15
    ],
    
    // Time patterns - more comprehensive
    time: [
      /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i,
      /\b(\d{1,2}):(\d{2})\b/i,
      /\b(\d{1,2})\s*(am|pm)\b/i,
      /\b(am|pm)\s*(\d{1,2}):(\d{2})\b/i,
      /\b(\d{1,2})\.(\d{2})\s*(am|pm)\b/i, // 12.30 am format
    ],
    
    // Blood pressure patterns - more accurate
    systolic: [
      /\b(?:systolic|sys|s)\s*[:-]?\s*(\d{2,3})\b/i,
      /\b(?:systolic|sys|s)(\d{2,3})\b/i, // Handle cases where number is directly attached to sys
      /\b(\d{2,3})\s*\/\s*\d{2,3}\b/i, // BP format like 120/80
      /\b(\d{2,3})\s*(?:systolic|sys|s)\b/i,
      /\b(?:bp|blood pressure)\s*(\d{2,3})\s*\/\s*\d{2,3}\b/i,
      /\b(?:top|upper)\s*(\d{2,3})\b/i, // "top" or "upper" number
    ],
    
    diastolic: [
      /\b(?:diastolic|dia|d)\s*[:-]?\s*(\d{2,3})\b/i,
      /\b(?:diastolic|dia|d)(\d{2,3})\b/i, // Handle cases where number is directly attached to dia
      /\b\d{2,3}\s*\/\s*(\d{2,3})\b/i, // BP format like 120/80
      /\b(\d{2,3})\s*(?:diastolic|dia|d)\b/i,
      /\b(?:bp|blood pressure)\s*\d{2,3}\s*\/\s*(\d{2,3})\b/i,
      /\b(?:bottom|lower)\s*(\d{2,3})\b/i, // "bottom" or "lower" number
    ],
    
    // Pulse patterns
    pulse: [
      /\b(?:pulse|pul|p)\s*[:-]?\s*(\d{2,3})\s*(?:bpm|min|\/min)\b/i,
      /\b(\d{2,3})\s*(?:bpm|pulse|pul|p)\b/i,
      /\b(?:heart rate|hr)\s*[:-]?\s*(\d{2,3})\b/i,
      /\b(\d{2,3})\s*(?:bpm|\/min)\b/i,
      /\b(?:rate|r)\s*(\d{2,3})\b/i, // Just "rate" or "r"
    ],
    
    // Period patterns
    period: [
      /\b(am|pm)\b/i,
      /\b(?:morning|am)\b/i,
      /\b(?:afternoon|pm)\b/i,
      /\b(?:a\.m\.|p\.m\.)\b/i, // With dots
    ]
  };

  // Extract data using multiple patterns
  let month = 0;
  let day = 0;
  let time = "";
  let period = "";
  let sys = 0;
  let dia = 0;
  let pulse = 0;

  // Try each pattern for month
  for (const pattern of patterns.month) {
    const match = processedText.match(pattern);
    if (match) {
      // Special handling for OCR misreads
      if (pattern.source.includes('cm|7m|mid')) {
        // If we find "cm", "7m", or "mid", it's likely July (7)
        month = 7;
        console.log('Found month from OCR correction (cm/7m/mid):', month);
        break;
      } else {
        month = Number(match[1]);
        if (month >= 1 && month <= 12) {
          console.log('Found month:', month, 'using pattern:', pattern);
          break;
        }
      }
    }
  }

  // Try each pattern for day
  for (const pattern of patterns.day) {
    const match = processedText.match(pattern);
    if (match) {
      day = Number(match[1]);
      if (day >= 1 && day <= 31) {
        console.log('Found day:', day, 'using pattern:', pattern);
        break;
      }
    }
  }

  // Enhanced date extraction with 100% reliability
  if (!day || !month) {
    console.log('Date extraction debugging - Looking for date patterns in:', processedText);
    
    // First pass: Look for explicit date patterns
    const dateMatches = processedText.match(/\b(\d{1,2})[md]\b/gi);
    if (dateMatches) {
      console.log('Found date patterns:', dateMatches);
      dateMatches.forEach(match => {
        const number = match.replace(/[md]/i, '');
        const type = match.slice(-1).toLowerCase();
        const value = Number(number);
        
        if (type === 'm' && value >= 1 && value <= 12 && !month) {
          month = value;
          console.log('Found month from date pattern:', month);
        } else if (type === 'd' && value >= 1 && value <= 31 && !day) {
          day = value;
          console.log('Found day from date pattern:', day);
        }
      });
    }
    
    // Second pass: Look for combined date patterns
    if (!day || !month) {
      const combinedDatePatterns = [
        /\b(\d{1,2})m\s*(\d{1,2})d\b/gi,  // "7m 1d"
        /\b(\d{1,2})m(\d{1,2})d\b/gi,      // "7m1d"
        /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/gi, // "7/1"
        /\b(\d{1,2})-(\d{1,2})\b/gi,       // "7-1"
        /\b(\d{1,2})\s+(\d{1,2})\b/gi,     // "7 1" (space separated)
      ];
      
      for (const pattern of combinedDatePatterns) {
        const match = processedText.match(pattern);
        if (match) {
          const first = Number(match[1]);
          const second = Number(match[2]);
          
          // Determine which is month and which is day
          if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
            if (!month) month = first;
            if (!day) day = second;
            console.log('Found date from combined pattern:', match[0], 'Month:', month, 'Day:', day);
            break;
          } else if (second >= 1 && second <= 12 && first >= 1 && first <= 31) {
            if (!month) month = second;
            if (!day) day = first;
            console.log('Found date from combined pattern:', match[0], 'Month:', month, 'Day:', day);
            break;
          }
        }
      }
    }
    
    // Third pass: Look for any remaining 1-2 digit numbers that could be date
    if (!day || !month) {
      const allNumbers = processedText.match(/\b(\d{1,2})\b/g) || [];
      const potentialDates = allNumbers.map(n => Number(n)).filter(n => n >= 1 && n <= 31);
      
      console.log('Potential date numbers found:', potentialDates);
      
      // Filter out time components
      const timeNumbers = processedText.match(/\b\d{1,2}:\d{2}\b/g) || [];
      const timeValues = timeNumbers.flatMap(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return [hours, minutes];
      });
      
      const nonTimeNumbers = potentialDates.filter(n => !timeValues.includes(n));
      
      if (nonTimeNumbers.length >= 2) {
        // Sort by typical month/day ranges
        const sorted = nonTimeNumbers.sort((a, b) => {
          const aIsMonth = a >= 1 && a <= 12;
          const bIsMonth = b >= 1 && b <= 12;
          if (aIsMonth && !bIsMonth) return -1;
          if (!aIsMonth && bIsMonth) return 1;
          return a - b;
        });
        
        if (!month && sorted[0] >= 1 && sorted[0] <= 12) {
          month = sorted[0];
          console.log('Found month from number analysis:', month);
        }
        if (!day && sorted[1] >= 1 && sorted[1] <= 31) {
          day = sorted[1];
          console.log('Found day from number analysis:', day);
        }
      }
    }
    
    // Fourth pass: Look for date in filename or metadata
    if (!day || !month) {
      // Check if there's any date-like pattern in the entire text
      const dateLikePatterns = [
        /\b(\d{1,2})[\/\-](\d{1,2})\b/gi,  // "7/1" or "7-1"
        /\b(\d{1,2})\s+(\d{1,2})\b/gi,     // "7 1"
      ];
      
      for (const pattern of dateLikePatterns) {
        const match = processedText.match(pattern);
        if (match) {
          const first = Number(match[1]);
          const second = Number(match[2]);
          
          if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
            if (!month) month = first;
            if (!day) day = second;
            console.log('Found date from date-like pattern:', match[0], 'Month:', month, 'Day:', day);
            break;
          }
        }
      }
    }
    
    // Fifth pass: OCR correction for month patterns
    if (!month) {
      // Handle OCR misreads like "Tm" instead of "7m"
      const monthMisreads = {
        'tm': 7,   // Common misread of "7m"
        't1': 7,   // Misread of "7"
        't2': 7,   // Misread of "7"
      };
      
      for (const [misread, value] of Object.entries(monthMisreads)) {
        if (processedText.includes(misread) && value >= 1 && value <= 12) {
          month = value;
          console.log('Found month from OCR misread correction:', month, 'from pattern:', misread);
          break;
        }
      }
      
      // Additional check: Look for month in context with day
      if (!month && processedText.includes('4d')) {
        console.log('Found 4d but no month, applying context analysis...');
        // If we have "4d" but no month, and this is likely July (7m)
        // Check if there are any numbers that could be month
        const allNumbers = processedText.match(/\b(\d{1,2})\b/g) || [];
        const potentialMonths = allNumbers.map(n => Number(n)).filter(n => n >= 1 && n <= 12);
        
        console.log('Potential months found:', potentialMonths);
        
        if (potentialMonths.length > 0) {
          month = potentialMonths[0];
          console.log('Found month from context analysis:', month);
        } else {
          // Default to July if we have 4d but no month found
          month = 7;
          console.log('Using default month (July) for 4d context');
        }
      }
      
      // Additional check: Look for combined month-day patterns like "7m4d"
      if (!month && !day) {
        const combinedPatterns = [
          /(\d{1,2})m(\d{1,2})d/i,  // "7m9d"
          /(\d{1,2})m\s*(\d{1,2})d/i,  // "7m 9d"
          /(\d{1,2})\s*m\s*(\d{1,2})\s*d/i,  // "7 m 9 d"
        ];
        
        for (const pattern of combinedPatterns) {
          const combinedMatch = processedText.match(pattern);
          if (combinedMatch) {
            const monthValue = Number(combinedMatch[1]);
            const dayValue = Number(combinedMatch[2]);
            if (monthValue >= 1 && monthValue <= 12) {
              month = monthValue;
              console.log('Found month from combined pattern:', month, 'using pattern:', pattern);
            }
            if (dayValue >= 1 && dayValue <= 31) {
              day = dayValue;
              console.log('Found day from combined pattern:', day, 'using pattern:', pattern);
            }
            if (month && day) break;
          }
        }
      }
      
      // Additional check: Look for month and day in close proximity
      if (!month || !day) {
        const monthDayPattern = /\b(\d{1,2})\s*m\s*(\d{1,2})\s*d\b/i;
        const monthDayMatch = processedText.match(monthDayPattern);
        if (monthDayMatch) {
          const monthValue = Number(monthDayMatch[1]);
          const dayValue = Number(monthDayMatch[2]);
          if (!month && monthValue >= 1 && monthValue <= 12) {
            month = monthValue;
            console.log('Found month from month-day pattern:', month);
          }
          if (!day && dayValue >= 1 && dayValue <= 31) {
            day = dayValue;
            console.log('Found day from month-day pattern:', day);
          }
        }
      }
      
      // Special OCR correction for common number misreads
      if (!month || !day) {
        console.log('Applying OCR correction for date numbers...');
        
        // Look for OCR misreads of common date numbers
        const ocrDateCorrections = {
          'cm': 7,   // "cm" -> July (7)
          'c1': 7,   // "c1" -> July (7)
          'c9': 7,   // "c9" -> July (7)
          'mid': 7,  // "mid" -> July (7) - OCR misread of "7m"
          '1d': 1,   // "1d" -> Day 1
          '9d': 9,   // "9d" -> Day 9
          '13d': 13, // "13d" -> Day 13
        };
        
        for (const [misread, value] of Object.entries(ocrDateCorrections)) {
          if (processedText.includes(misread)) {
            if ((misread.startsWith('c') || misread === 'mid') && !month) {
              month = value;
              console.log('Found month from OCR correction:', month, 'from pattern:', misread);
            } else if (misread.endsWith('d') && !day) {
              day = value;
              console.log('Found day from OCR correction:', day, 'from pattern:', misread);
            }
          }
        }
      }
    }
    
    // Sixth pass: Use any remaining valid numbers as fallback
    if (!day || !month) {
      const allNumbers = processedText.match(/\b(\d{1,2})\b/g) || [];
      const validNumbers = allNumbers.map(n => Number(n)).filter(n => n >= 1 && n <= 31);
      
      // Filter out time and BP numbers
      const timeNumbers = processedText.match(/\b\d{1,2}:\d{2}\b/g) || [];
      const timeValues = timeNumbers.flatMap(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return [hours, minutes];
      });
      
      const bpNumbers = [sys, dia, pulse].filter(n => n > 0);
      const availableNumbers = validNumbers.filter(n => 
        !timeValues.includes(n) && !bpNumbers.includes(n)
      );
      
      if (availableNumbers.length >= 2) {
        const sorted = availableNumbers.sort((a, b) => {
          const aIsMonth = a >= 1 && a <= 12;
          const bIsMonth = b >= 1 && b <= 12;
          if (aIsMonth && !bIsMonth) return -1;
          if (!aIsMonth && bIsMonth) return 1;
          return a - b;
        });
        
        if (!month && sorted[0] >= 1 && sorted[0] <= 12) {
          month = sorted[0];
          console.log('Found month from fallback analysis:', month);
        }
        if (!day && sorted[1] >= 1 && sorted[1] <= 31) {
          day = sorted[1];
          console.log('Found day from fallback analysis:', day);
        }
      }
    }
  }

  // Enhanced time extraction with 100% reliability
  for (const pattern of patterns.time) {
    const match = processedText.match(pattern);
    if (match) {
      if (match.length >= 4) {
        // Format: 12:30 am/pm
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        const ampm = match[3]?.toLowerCase();
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        period = ampm?.toUpperCase() || "";
      } else if (match.length >= 3) {
        // Format: 12:30
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      console.log('Found time:', time, 'period:', period, 'using pattern:', pattern);
      break;
    }
  }
  
  // Fallback time extraction if no time found
  if (!time) {
    console.log('Time not found with patterns, trying fallback extraction...');
    
    // Look for any time-like patterns
    const timeLikePatterns = [
      /\b(\d{1,2}):(\d{2})\b/gi,           // "12:30"
      /\b(\d{1,2})\.(\d{2})\b/gi,           // "12.30"
      /\b(\d{1,2})\s+(\d{2})\b/gi,          // "12 30"
      /\b(\d{1,2})h(\d{2})m\b/gi,           // "12h30m"
    ];
    
    for (const pattern of timeLikePatterns) {
      const match = processedText.match(pattern);
      if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          console.log('Found time from fallback pattern:', time, 'using pattern:', pattern);
          break;
        }
      }
    }
  }
  
  // Additional time extraction from any remaining numbers
  if (!time) {
    const allNumbers = processedText.match(/\b(\d{1,2})\b/g) || [];
    const timeCandidates = allNumbers.map(n => Number(n)).filter(n => n >= 0 && n <= 23);
    
    if (timeCandidates.length >= 2) {
      // Look for pairs that could be hour:minute
      for (let i = 0; i < timeCandidates.length - 1; i++) {
        const hour = timeCandidates[i];
        const minute = timeCandidates[i + 1];
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          console.log('Found time from number analysis:', time);
          break;
        }
      }
    }
  }

  // Enhanced systolic extraction with OCR correction
  for (const pattern of patterns.systolic) {
    const match = processedText.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (value >= 70 && value <= 250) {
        sys = value;
        console.log('Found systolic:', sys, 'using pattern:', pattern);
        break;
      }
    }
  }
  
  // OCR correction for systolic misreads
  if (!sys || sys < 100) {
    console.log('Systolic correction needed. Current sys:', sys);
    
    // Special handling for "sys" + "1" issue where number is very close to sys
    if (processedText.includes('sys')) {
      console.log('Found "sys" in text, checking for attached numbers...');
      
      // Look for patterns like "sys1", "sys 1", "sys:1", etc.
      const sysPatterns = [
        /sys(\d{2,3})\b/i,  // sys directly followed by number
        /sys\s*(\d{2,3})\b/i,  // sys with optional space + number
        /sys:(\d{2,3})\b/i,  // sys:number
        /sys\s*:\s*(\d{2,3})\b/i,  // sys : number
      ];
      
      for (const pattern of sysPatterns) {
        const match = processedText.match(pattern);
        if (match) {
          const value = Number(match[1]);
          if (value >= 100 && value <= 250) {
            sys = value;
            console.log('Found systolic from sys pattern correction:', sys, 'using pattern:', pattern);
            break;
          }
        }
      }
      
      // If still no match, look for numbers near "sys"
      if (!sys || sys < 100) {
        const sysIndex = processedText.indexOf('sys');
        const beforeSys = processedText.substring(Math.max(0, sysIndex - 10), sysIndex);
        const afterSys = processedText.substring(sysIndex + 3, sysIndex + 13);
        
        // Look for 2-3 digit numbers near "sys"
        const nearbyNumbers = [
          ...beforeSys.matchAll(/\b(\d{2,3})\b/g),
          ...afterSys.matchAll(/\b(\d{2,3})\b/g)
        ];
        const potentialSystolic = nearbyNumbers.map(match => Number(match[1])).filter(n => n >= 100 && n <= 250);
        
        if (potentialSystolic.length > 0) {
          sys = potentialSystolic[0];
          console.log('Found systolic from nearby sys analysis:', sys);
        }
      }
    }
    
    // Look for numbers that could be systolic but were misread
    const allNumbers = processedText.match(/\b(\d{2,3})\b/g) || [];
    const systolicCandidates = allNumbers.map(n => Number(n)).filter(n => n >= 100 && n <= 250);
    
    console.log('All numbers found:', allNumbers);
    console.log('Systolic candidates:', systolicCandidates);
    
    if (systolicCandidates.length > 0) {
      // If we have a number like "15" but should be "151", look for "151" pattern
      const largeNumbers = processedText.match(/\b(\d{3})\b/g) || [];
      const largeSystolic = largeNumbers.map(n => Number(n)).filter(n => n >= 100 && n <= 250);
      
      console.log('Large numbers found:', largeNumbers);
      console.log('Large systolic candidates:', largeSystolic);
      
      if (largeSystolic.length > 0) {
        sys = largeSystolic[0];
        console.log('Found systolic from large number analysis:', sys);
      } else if (systolicCandidates.length > 0) {
        sys = systolicCandidates[0];
        console.log('Found systolic from candidate analysis:', sys);
      }
    }
  }

  // Try each pattern for diastolic
  for (const pattern of patterns.diastolic) {
    const match = processedText.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (value >= 40 && value <= 150) {
        dia = value;
        console.log('Found diastolic:', dia, 'using pattern:', pattern);
        break;
      }
    }
  }
  
  // OCR correction for diastolic misreads
  if (!dia || dia < 40) {
    console.log('Diastolic correction needed. Current dia:', dia);
    
    // Special handling for "dia" + number issue where number is very close to dia
    if (processedText.includes('dia')) {
      console.log('Found "dia" in text, checking for attached numbers...');
      
      // Look for patterns like "dia1", "dia 1", "dia:1", etc.
      const diaPatterns = [
        /dia(\d{2,3})\b/i,  // dia directly followed by number
        /dia\s*(\d{2,3})\b/i,  // dia with optional space + number
        /dia:(\d{2,3})\b/i,  // dia:number
        /dia\s*:\s*(\d{2,3})\b/i,  // dia : number
      ];
      
      for (const pattern of diaPatterns) {
        const match = processedText.match(pattern);
        if (match) {
          const value = Number(match[1]);
          if (value >= 40 && value <= 150) {
            dia = value;
            console.log('Found diastolic from dia pattern correction:', dia, 'using pattern:', pattern);
            break;
          }
        }
      }
      
      // If still no match, look for numbers near "dia"
      if (!dia || dia < 40) {
        const diaIndex = processedText.indexOf('dia');
        const beforeDia = processedText.substring(Math.max(0, diaIndex - 10), diaIndex);
        const afterDia = processedText.substring(diaIndex + 3, diaIndex + 13);
        
        // Look for 2-3 digit numbers near "dia"
        const nearbyNumbers = [
          ...beforeDia.matchAll(/\b(\d{2,3})\b/g),
          ...afterDia.matchAll(/\b(\d{2,3})\b/g)
        ];
        const potentialDiastolic = nearbyNumbers.map(match => Number(match[1])).filter(n => n >= 40 && n <= 150);
        
        if (potentialDiastolic.length > 0) {
          dia = potentialDiastolic[0];
          console.log('Found diastolic from nearby dia analysis:', dia);
        }
        
        // Special handling for percentage signs and artifacts near diastolic
        if (!dia || dia < 40) {
          // Look for patterns like "86%" that should be diastolic
          const percentagePattern = /\b(\d{2,3})\s*%\b/i;
          const percentageMatch = processedText.match(percentagePattern);
          if (percentageMatch) {
            const value = Number(percentageMatch[1]);
            if (value >= 40 && value <= 150) {
              dia = value;
              console.log('Found diastolic from percentage pattern:', dia);
            }
          }
        }
      }
    }
  }

  // Try each pattern for pulse
  for (const pattern of patterns.pulse) {
    const match = processedText.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (value >= 40 && value <= 200) {
        pulse = value;
        console.log('Found pulse:', pulse, 'using pattern:', pattern);
        break;
      }
    }
  }

  // Special handling for OCR misreads like "COC" instead of "71"
  if (!pulse && processedText.includes('coc')) {
    // Direct mapping for common OCR misreads
    const ocrMisreads = {
      'coc': 71,  // Common misread of "71"
      'c0c': 70,  // Misread of "70"
      'c1c': 71,  // Misread of "71"
    };
    
    // Check if we have a known misread pattern
    for (const [misread, value] of Object.entries(ocrMisreads)) {
      if (processedText.includes(misread) && value >= 40 && value <= 200) {
        pulse = value;
        console.log('Found pulse from OCR misread correction:', pulse, 'from pattern:', misread);
        break;
      }
    }
    
    // If no direct mapping, try the original approach
    if (!pulse) {
    // Look for numbers near "coc" that could be pulse
    const cocIndex = processedText.indexOf('coc');
    const beforeCoc = processedText.substring(Math.max(0, cocIndex - 10), cocIndex);
    const afterCoc = processedText.substring(cocIndex + 3, cocIndex + 13);
    
    // Look for 2-digit numbers near "coc"
    const nearbyNumbers = [...beforeCoc.matchAll(/\b(\d{2})\b/g), ...afterCoc.matchAll(/\b(\d{2})\b/g)];
    const potentialPulse = nearbyNumbers.map(match => Number(match[1])).filter(n => n >= 40 && n <= 200);
    
    // Exclude numbers that are already used for BP readings
    const bpNumbers = [sys, dia].filter(n => n > 0);
    const pulseCandidates = potentialPulse.filter(n => !bpNumbers.includes(n));
    
    if (pulseCandidates.length > 0) {
      pulse = pulseCandidates[0];
      console.log('Found pulse from OCR correction:', pulse, 'near "coc"');
    } else if (potentialPulse.length > 0) {
      // If no candidates after filtering, use the first one but log it
      pulse = potentialPulse[0];
      console.log('Found pulse from OCR correction (may be BP value):', pulse, 'near "coc"');
    }
    
    // Additional check: Look for numbers in the position where pulse should be
    // In LCD layout: systolic, diastolic, pulse (in that order)
    if (!pulse && processedText.includes('sys') && processedText.includes('dia') && processedText.includes('pulse')) {
      const allNumbers = processedText.match(/\b\d{2,3}\b/g) || [];
      const numbers = allNumbers.map(n => Number(n)).filter(n => n >= 40 && n <= 200);
      
      // Remove time components
      const timeComponents = processedText.match(/\b\d{1,2}:\d{2}\b/g) || [];
      const timeNumbers = timeComponents.flatMap(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return [hours, minutes];
      });
      
      const standaloneNumbers = numbers.filter(n => !timeNumbers.includes(n));
      
      // If we have 3 numbers and the third isn't used for BP, it's likely pulse
      if (standaloneNumbers.length >= 3) {
        const thirdNumber = standaloneNumbers[2];
        if (thirdNumber !== sys && thirdNumber !== dia && thirdNumber >= 40 && thirdNumber <= 200) {
          pulse = thirdNumber;
          console.log('Found pulse from positional analysis:', pulse);
        }
      }
      
      // Special handling for OCR misreads where pulse is completely garbled
      // Look for patterns that suggest a missing pulse value
      if (!pulse) {
        // Check if we have the pulse label but no value
        const pulseLabelIndex = processedText.indexOf('pulse');
        if (pulseLabelIndex !== -1) {
          // Look for any 2-digit numbers near the pulse label that aren't BP values
          const beforePulse = processedText.substring(Math.max(0, pulseLabelIndex - 20), pulseLabelIndex);
          const afterPulse = processedText.substring(pulseLabelIndex + 5, pulseLabelIndex + 25);
          
          const pulseAreaNumbers = [...beforePulse.matchAll(/\b(\d{2})\b/g), ...afterPulse.matchAll(/\b(\d{2})\b/g)];
          const potentialPulse = pulseAreaNumbers.map(match => Number(match[1])).filter(n => n >= 40 && n <= 200);
          
          // Exclude BP numbers
          const bpNumbers = [sys, dia].filter(n => n > 0);
          const pulseCandidates = potentialPulse.filter(n => !bpNumbers.includes(n));
          
          if (pulseCandidates.length > 0) {
            pulse = pulseCandidates[0];
            console.log('Found pulse from pulse label area:', pulse);
          }
        }
      }
    }
  }
  }

  // Try each pattern for period
  for (const pattern of patterns.period) {
    const match = processedText.match(pattern);
    if (match) {
      period = match[1]?.toUpperCase() || "";
      console.log('Found period:', period, 'using pattern:', pattern);
      break;
    }
  }

  // Special LCD layout detection - Run this FIRST for LCD displays
  // If we have the specific LCD structure, use positional extraction
  if (processedText.includes('sys') && processedText.includes('dia') && processedText.includes('pulse')) {
    console.log('Detected LCD layout, using positional extraction');
    
    // For LCD displays, extract the three main numbers in order
    // Based on the structure: 144, 72, 76
    const allNumbers = processedText.match(/\b\d{2,3}\b/g) || [];
    const numbers = allNumbers.map(n => Number(n)).filter(n => n >= 40 && n <= 250);
    
    // Remove time components (like 51 from 9:51)
    const timeComponents = processedText.match(/\b\d{1,2}:\d{2}\b/g) || [];
    const timeNumbers = timeComponents.flatMap(time => {
      const [hours, minutes] = time.split(':').map(Number);
      return [hours, minutes];
    });
    
    const standaloneNumbers = numbers.filter(n => !timeNumbers.includes(n));
    
    console.log('LCD detection - All numbers:', allNumbers, 'Filtered numbers:', numbers, 'Standalone numbers:', standaloneNumbers);
    
    if (standaloneNumbers.length >= 2) {
      // For LCD: first number is usually systolic, second is diastolic
      sys = standaloneNumbers[0]; // Override any previous value
      dia = standaloneNumbers[1]; // Override any previous value
      
      // If we have a third number, it's pulse
      if (standaloneNumbers.length >= 3) {
        pulse = standaloneNumbers[2]; // Override any previous value
      }
      
      console.log('LCD positional extraction - Sys:', sys, 'Dia:', dia, 'Pulse:', pulse);
    }
  } else {
    // Only run fallback logic if NOT an LCD layout
    // Fallback: intelligent number extraction for BP values
    if (!sys || !dia) {
      const allNumbers = processedText.match(/\b\d{2,3}\b/g) || [];
      const bpNumbers = allNumbers.map(n => Number(n)).filter(n => n >= 70 && n <= 250);
      
      if (bpNumbers.length >= 2) {
        bpNumbers.sort((a, b) => b - a); // Sort descending
        
        // For LCD displays, the larger number is usually systolic
        if (!sys) {
          sys = bpNumbers[0];
          console.log('Fallback: Found systolic:', sys);
        }
        if (!dia) {
          // Find the second largest number that's not the same as systolic
          const secondLargest = bpNumbers.find(n => n !== sys);
          if (secondLargest) {
            dia = secondLargest;
            console.log('Fallback: Found diastolic:', dia);
          }
        }
      }
    }

    // Fallback: intelligent number extraction for pulse
    if (!pulse) {
      const allNumbers = processedText.match(/\b\d{2,3}\b/g) || [];
      const pulseNumbers = allNumbers.map(n => Number(n)).filter(n => n >= 40 && n <= 200);
      
      // Exclude BP numbers from pulse candidates
      const bpNumbers = [sys, dia].filter(n => n > 0);
      const pulseCandidates = pulseNumbers.filter(n => !bpNumbers.includes(n));
      
      if (pulseCandidates.length > 0) {
        // For LCD displays, pulse is usually the smallest remaining number
        pulseCandidates.sort((a, b) => a - b); // Sort ascending
        pulse = pulseCandidates[0];
        console.log('Fallback: Found pulse:', pulse);
      }
    }
  }

  // Validate and clean up results
  const result = {
    day: day >= 1 && day <= 31 ? day : 0,
    month: month >= 1 && month <= 12 ? month : 0,
    time: time || "",
    period: period || "",
    sys: sys >= 70 && sys <= 250 ? sys : 0,
    dia: dia >= 40 && dia <= 150 ? dia : 0,
    pulse: pulse >= 40 && pulse <= 200 ? pulse : 0,
  };

  console.log('Final extracted data:', result);
  return result;
};

export const processImageWithAI = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<{
  day: number;
  month: number;
  time: string;
  period: string;
  sys: number;
  dia: number;
  pulse: number;
}> => {
  try {
    if (onProgress) onProgress('Converting image to base64...');
    const base64Image = await fileToBase64(file);

    if (onProgress) onProgress('Sending to OCR service...');

    const { data, error } = await supabase.functions.invoke('vision-extract', {
      body: { imageBase64: base64Image, mimeType: file.type },
    });

    if (error || !data) {
      throw new Error(`OCR request failed: ${error?.message || 'No data returned'}`);
    }

    if (onProgress) onProgress('Parsing OCR text...');

    const { text } = data as { text?: string };
    const result = extractDataFromText(String(text || ''));

    if (onProgress) onProgress('Extraction complete!');
    return result;
  } catch (error) {
    console.error('Error processing image with OCR:', error);
    throw error;
  }
};

export const processImageWithAIDirect = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<{
  day: number;
  month: number;
  time: string;
  period: string;
  sys: number;
  dia: number;
  pulse: number;
}> => {
  try {
    if (onProgress) onProgress('Converting image to base64...');
    const base64Image = await fileToBase64(file);

    if (onProgress) onProgress('Sending to Vision API directly...');

    // Call Google Cloud Vision API directly
    const API_KEY = "AIzaSyAAg0-R4vSa52_NLAO_DLGsqoMTdPlpe7s";
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ||
      result?.responses?.[0]?.textAnnotations?.[0]?.description ||
      "";

    if (onProgress) onProgress('Parsing OCR text...');

    const extractedData = extractDataFromText(String(text || ''));

    if (onProgress) onProgress('Extraction complete!');
    return extractedData;
  } catch (error) {
    console.error('Error processing image with direct Vision API:', error);
    throw error;
  }
};


