
import { GoogleGenAI, Type } from "@google/genai";
import { ProductVariant, Location, Category } from '../types';

// FIX: As per guidelines, the API key must be obtained exclusively from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productInfo: { name?: string; category?: string; price?: number, variants?: ProductVariant[] }): Promise<string> => {
  const prompt = `Generate a compelling and professional product description for a warehouse management system catalog.
  
  Product Name: ${productInfo.name || 'N/A'}
  Category: ${productInfo.category || 'N/A'}
  Price: ₹${productInfo.price || 'N/A'}
  Key Variants/Features: ${productInfo.variants?.map(v => `${v.name}: ${v.value}`).join(', ') || 'N/A'}
  
  The description should be concise, informative, and around 2-3 sentences long. Highlight its key selling points based on the provided details.`;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 1,
          topK: 32,
        }
    });
    return (response.text ?? '').trim();
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "generateProductDescription",
      message: "Error generating product description",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { productInfo }
    }));
    return "Failed to generate description.";
  }
};


export const suggestPutAwayLocation = async (productName: string, category: string, availableLocations: Location[]): Promise<string> => {
    // Filter for locations that are not full or under maintenance, and are actual storage spots
    const relevantLocations = availableLocations.filter(l => l.status === 'Available' && ['Bin', 'Shelf', 'Rack'].includes(l.type));
    if (relevantLocations.length === 0) {
        return ""; // No available locations to suggest
    }

    const locationsString = relevantLocations
        .map(l => `- Code: ${l.code}, Name: ${l.name}, Type: ${l.type}, Zone: ${l.zone}, Capacity: ${l.capacity}`)
        .slice(0, 50) // Limit to avoid exceeding prompt size limits
        .join('\n');

    const prompt = `A new item has arrived at the warehouse. Based on its details and a list of available storage locations, suggest the single most optimal location code to put it away.

    Item Details:
    - Name: "${productName}"
    - Category: "${category}"

    Available Locations:
    ${locationsString}

    Warehouse Put-Away Rules:
    1. Small, high-turnover items (e.g., electronics accessories, office supplies) should go into Bins or Shelves in Zone A.
    2. Medium-sized items should go into Racks or Shelves in Zone B.
    3. Large, bulky, or heavy items should go into Pallet Racks in Zone C.
    4. Fragile or special handling items should go to Zone D if available.
    5. Prioritize locations that are marked as 'Available'.

    Based on the item details and these rules, analyze the available locations and suggest exactly ONE location code.
    Your response must be only the location code and nothing else. For example: A2-S3-B2`;

    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return (response.text ?? '').trim().replace(/[^A-Z0-9-]/g, ''); // Sanitize output
    } catch (error) {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            service: "geminiService",
            function: "suggestPutAwayLocation",
            message: "Error suggesting put-away location",
            error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
            context: { productName, category }
        }));
        // Fallback to a random available location
        return relevantLocations[Math.floor(Math.random() * relevantLocations.length)]?.code || "";
    }
};

export const generateSalesForecast = async (productName: string, historicalData: { month: string, sales: number }[]): Promise<{ forecast: { month: string, predictedSales: number }[], reasoning: string }> => {
    const prompt = `
    Based on the following historical sales data for the product "${productName}", generate a sales forecast for the next 3 months.
    
    Historical Data:
    ${historicalData.map(d => `- ${d.month}: ${d.sales} units`).join('\n')}

    Provide a brief reasoning for your forecast, considering trends or seasonality if apparent.
    Return the data in a JSON object with two keys: "forecast" (an array of objects with "month" and "predictedSales") and "reasoning" (a string).
    The next three months are relative to the last month in the historical data.
    `;

    try {
      // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              forecast: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    predictedSales: { type: Type.NUMBER },
                  },
                  required: ["month", "predictedSales"],
                },
              },
              reasoning: { type: Type.STRING },
            },
            required: ["forecast", "reasoning"],
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("Empty response from Gemini API for sales forecast.");
      }
      return JSON.parse(jsonText);
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        service: "geminiService",
        function: "generateSalesForecast",
        message: "Error generating sales forecast",
        error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
        context: { productName }
      }));
      return {
        forecast: [],
        reasoning: "An error occurred while generating the forecast."
      };
    }
};

export const getCoordinatesFromAddress = async (address: string): Promise<{ latitude: number; longitude: number }> => {
  const prompt = `Find the geographic coordinates (latitude and longitude) for the following address: "${address}"`;
  
  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latitude: { type: Type.NUMBER, description: "Latitude coordinate" },
            longitude: { type: Type.NUMBER, description: "Longitude coordinate" },
          },
          required: ["latitude", "longitude"],
        },
      },
    });
    
    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("Empty response from Gemini API for coordinates.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "getCoordinatesFromAddress",
      message: "Error fetching coordinates from address",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { address }
    }));
    throw new Error("Failed to fetch coordinates from address.");
  }
};

export const generateReportSummary = async (kpis: { totalValue: number; totalUnits: number; fillRate: number }): Promise<string> => {
    const prompt = `
    Analyze the following key performance indicators for a warehouse and generate a brief, insightful executive summary (2-3 sentences).
    Focus on the overall health and performance. Be professional and concise.

    KPIs:
    - Total Inventory Value: ₹${kpis.totalValue.toLocaleString('en-IN')}
    - Total Stock Units: ${kpis.totalUnits.toLocaleString('en-IN')}
    - Order Fill Rate: ${kpis.fillRate.toFixed(1)}%

    Example Summary: "The warehouse maintains a strong order fill rate, indicating efficient fulfillment. The total inventory value and unit count represent a significant asset base, which should be monitored for turnover efficiency."
    `;

    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error generating report summary:", error);
        return "Could not generate AI summary at this time.";
    }
};

export const suggestSku = async (productName: string, categoryName?: string): Promise<string> => {
    const finalCategoryName = categoryName || 'General';
    const prompt = `
    Generate a concise, logical, and unique SKU for a new product in a warehouse management system.
    The SKU should be uppercase, use letters and numbers, and be separated by dashes.
    It should be based on the product name and category.

    Rules:
    1. Start with the first 3 letters of the category.
    2. Follow with the first 3 letters of the product name's main word.
    3. End with a 3-digit random number.
    4. Format: CAT-PRO-XXX

    Example:
    Product Name: "ProBook Laptop", Category: "Electronics" -> ELE-PRO-123
    
    Generate an SKU for this product:
    - Product Name: "${productName}"
    - Category: "${finalCategoryName}"

    Your response must be only the SKU and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return (response.text ?? '').trim().replace(/[^A-Z0-9-]/g, '');
    } catch (error) {
        console.error("Error generating SKU:", error);
        const catPart = (finalCategoryName).substring(0, 3).toUpperCase();
        const namePart = (productName || 'PROD').substring(0, 3).toUpperCase();
        const numPart = Math.floor(Math.random() * 900) + 100;
        return `${catPart}-${namePart}-${numPart}`;
    }
};

export const suggestProductCode = async (productName: string, categoryName?: string): Promise<string> => {
    const prompt = `
    Generate a concise, logical, and unique Product Code for a new product in a warehouse management system.
    The Product Code should be uppercase, use letters and numbers, and be separated by a dash.

    Rules:
    1. Start with the first 4 letters of the product name's main word.
    2. Follow with a dash.
    3. End with a 4-digit random number.
    4. Format: PROD-XXXX

    Example:
    Product Name: "ProBook Laptop", Category: "Electronics" -> PROB-4582

    Generate a Product Code for:
    - Product Name: "${productName}"

    Your response must be only the Product Code and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return (response.text ?? '').trim().replace(/[^A-Z0-9-]/g, '');
    } catch (error) {
        console.error("Error generating Product Code:", error);
        const namePart = (productName || 'PROD').substring(0, 4).toUpperCase();
        const numPart = Math.floor(Math.random() * 9000) + 1000;
        return `${namePart}-${numPart}`;
    }
};

export const suggestBrandId = async (productName: string): Promise<string> => {
    const prompt = `
    Generate a unique 3-digit Brand ID for a new product in a warehouse management system.
    The ID must be a number between 100 and 999.

    Product Name: "${productName}"

    Your response must be only the 3-digit number and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        // Sanitize to ensure only numbers are returned
        return (response.text ?? '').trim().replace(/[^0-9]/g, '');
    } catch (error) {
        console.error("Error generating Brand ID:", error);
        // Fallback to random number generation
        return (Math.floor(Math.random() * 900) + 100).toString();
    }
};

export const suggestLabelId = async (productName: string): Promise<string> => {
    const prompt = `
    Generate a unique 3-digit Label ID for a new product in a warehouse management system.
    The ID must be a number between 100 and 999.

    Product Name: "${productName}"

    Your response must be only the 3-digit number and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        // Sanitize to ensure only numbers are returned
        return (response.text ?? '').trim().replace(/[^0-9]/g, '');
    } catch (error) {
        console.error("Error generating Label ID:", error);
        // Fallback to random number generation
        return (Math.floor(Math.random() * 900) + 100).toString();
    }
};

export const validateCustomerName = async (name: string): Promise<{ isValid: boolean; reason: string }> => {
  const prompt = `
    Analyze the following text and determine if it is a plausible full name for a person.
    - Single words that are common first names (e.g., "John") are plausible.
    - Two or three words that form a typical name structure (e.g., "John Smith", "Maria del Carmen") are plausible.
    - Names with initials are plausible (e.g., "J. R. R. Tolkien").
    - Reject company names (e.g., "Tech Corp Inc."), gibberish (e.g., "asdfghjkl"), sentences, or text containing excessive numbers or symbols.
    
    Input text: "${name}"
    
    Return a JSON object with two keys: "isValid" (boolean) and "reason" (a brief string explaining why it's invalid, or an empty string if valid).
  `;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True if the input is a plausible human name, false otherwise."
            },
            reason: {
              type: Type.STRING,
              description: "A brief reason why the name is considered invalid (e.g., 'Contains numbers', 'Is gibberish'). Empty if valid."
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini API for name validation.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "validateCustomerName",
      message: "Error validating customer name",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { name }
    }));
    // In case of an API error, fail open (assume it's valid to not block the user)
    return { isValid: true, reason: "AI validation failed." };
  }
};

export const validateProductName = async (name: string): Promise<{ isValid: boolean; reason: string }> => {
  const prompt = `
    Analyze the following text and determine if it is a plausible name for a commercial product (physical or digital).
    - Names can be single words or multiple words.
    - Reject gibberish (e.g., "asdfghjkl"), full sentences, questions, or text that is clearly not a product name.
    - Names with numbers or model numbers are plausible (e.g., "Quantum Drive 5000", "iPhone 15").
    - Reject text with excessive special symbols.
    
    Input text: "${name}"
    
    Return a JSON object with two keys: "isValid" (boolean) and "reason" (a brief string explaining why it's invalid, or an empty string if valid).
  `;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True if the input is a plausible product name, false otherwise."
            },
            reason: {
              type: Type.STRING,
              description: "A brief reason why the name is considered invalid (e.g., 'Is a full sentence', 'Is gibberish'). Empty if valid."
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini API for product name validation.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "validateProductName",
      message: "Error validating product name",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { name }
    }));
    // Fail open in case of API error to not block the user.
    return { isValid: true, reason: "AI validation failed." };
  }
};

export const validateSupplierName = async (name: string): Promise<{ isValid: boolean; reason: string }> => {
  const prompt = `
    Analyze the following text and determine if it is a plausible name for a commercial supplier or company.
    - Names can be single words or multiple words.
    - Names with identifiers like "Inc.", "Corp", "Ltd", "LLC", "Global", "Solutions", "Tech" are plausible.
    - Reject gibberish (e.g., "asdfghjkl"), full sentences, questions, or text that is clearly not a company name.
    - Simple personal names (e.g., "John Smith") are less plausible unless they include a business-related term like "and Sons".
    
    Input text: "${name}"
    
    Return a JSON object with two keys: "isValid" (boolean) and "reason" (a brief string explaining why it's invalid, or an empty string if valid).
  `;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True if the input is a plausible supplier/company name, false otherwise."
            },
            reason: {
              type: Type.STRING,
              description: "A brief reason why the name is considered invalid. Empty if valid."
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini API for supplier name validation.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "validateSupplierName",
      message: "Error validating supplier name",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { name }
    }));
    // Fail open
    return { isValid: true, reason: "AI validation failed." };
  }
};

export const suggestCategory = async (productName: string, availableCategories: { id: string; name: string }[]): Promise<string> => {
  if (availableCategories.length === 0) {
    return "";
  }

  const categoriesString = availableCategories
    .map(c => `- ${c.name} (id: ${c.id})`)
    .join('\n');

  const prompt = `Based on the product name "${productName}", which of the following categories is the most appropriate?

Available Categories:
${categoriesString}

Analyze the product name and choose the best fit from the categories provided.
Your response must be only the category ID and nothing else. For example: cat-1`;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    
    const rawText = (response.text ?? '').trim();
    // Find the last alphanumeric/hyphen sequence which is likely the ID
    const match = rawText.match(/([a-zA-Z0-9-]+)$/); 
    
    if (match) {
        const potentialId = match[0];
        // Final check to see if the returned ID is in our list
        if (availableCategories.some(c => c.id === potentialId)) {
            return potentialId;
        }
    }
    
    console.warn(`Gemini suggested an invalid or unrecognizable category ID: "${rawText}"`);
    return "";

  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "suggestCategory",
      message: "Error suggesting category",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { productName }
    }));
    return "";
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  if (!prompt) {
    throw new Error("Prompt is required for image generation.");
  }
  
  try {
    // FIX: Updated image generation to use 'gemini-2.5-flash-image' and 'generateContent' as per guidelines.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
    });

    let imageUrl = '';
    // FIX: Iterate through all parts to find the image part as required by guidelines.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const base64EncodeString: string = part.inlineData.data;
        imageUrl = `data:image/png;base64,${base64EncodeString}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image was generated by the API.");
    }

    return imageUrl;
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "geminiService",
      function: "generateImage",
      message: "Error generating image",
      error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
      context: { prompt }
    }));
    throw new Error("Failed to generate image.");
  }
};

export const suggestLocationCode = async (locationInfo: {
    type: string;
    zone?: string;
    warehouseName?: string;
}): Promise<string> => {
    const prompt = `
    Generate a concise, logical, and unique Location Code for a new warehouse location.
    The code should follow standard warehouse conventions (e.g., ZONE-RACK-SHELF-BIN).

    Rules:
    1. The code should be uppercase, using letters, numbers, and hyphens.
    2. It should be based on the provided location details.
    3. End with a 2-digit random number to ensure uniqueness.
    4. Format examples:
        - Zone: A, Type: Rack -> A-RACK-01
        - Zone: B, Type: Shelf -> B-SHELF-12
        - Zone: Receiving, Type: Bin -> REC-BIN-45

    Generate a Location Code for this location:
    - Warehouse: "${locationInfo.warehouseName || 'Main Warehouse'}"
    - Zone: "${locationInfo.zone || 'General'}"
    - Type: "${locationInfo.type}"

    Your response must be only the Location Code and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return (response.text ?? '').trim().replace(/[^A-Z0-9-]/g, '');
    } catch (error) {
        console.error("Error generating Location Code:", error);
        // Fallback generation
        const zonePart = (locationInfo.zone || 'GEN').substring(0, 3).toUpperCase();
        const typePart = (locationInfo.type || 'LOC').substring(0, 3).toUpperCase();
        const numPart = Math.floor(Math.random() * 90) + 10;
        return `${zonePart}-${typePart}-${numPart}`;
    }
};

export const suggestLocationName = async (locationInfo: {
    type: string;
    code?: string;
    zone?: string;
}): Promise<string> => {
    const prompt = `
    Generate a clear, human-readable name for a warehouse location based on its details.

    Examples:
    - Code: A-RACK-01, Type: Rack -> "Rack A-01"
    - Code: B-SHELF-12, Type: Shelf -> "Shelf B-12 in General Zone"

    Generate a name for this location:
    - Code: "${locationInfo.code || 'N/A'}"
    - Zone: "${locationInfo.zone || 'General'}"
    - Type: "${locationInfo.type}"

    Your response must be only the Location Name and nothing else.
    `;
    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error generating Location Name:", error);
        return `${locationInfo.type} ${locationInfo.code || ''}`.trim();
    }
};

export const validateLocationCode = async (code: string, type: string): Promise<{ isValid: boolean; reason: string }> => {
  const prompt = `
    Analyze the following text and determine if it is a plausible Location Code for a warehouse management system.

    Rules:
    - The code should be concise and logical for a "${type}" location.
    - It must consist of uppercase letters, numbers, and hyphens ONLY.
    - It should not be gibberish (e.g., "ASDF-GH-JKL"), a full sentence, or contain special characters other than hyphens.
    - Standard formats like ZONE-RACK-SHELF-BIN (e.g., "A-R01-S03-B05") are valid. Simpler codes like "A-01" or "RACK-15" are also valid.

    Input text: "${code}"
    
    Return a JSON object with two keys: "isValid" (boolean) and "reason" (a brief string explaining why it's invalid, or an empty string if valid).
  `;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
            },
            reason: {
              type: Type.STRING,
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini API for location code validation.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error validating location code:", error);
    // Fail open
    return { isValid: true, reason: "AI validation failed." };
  }
};

export const validateLocationName = async (name: string): Promise<{ isValid: boolean; reason: string }> => {
  const prompt = `
    Analyze the following text and determine if it is a plausible descriptive name for a location within a warehouse (like a zone, rack, shelf, or bin).

    Rules:
    - Names can be multiple words and include numbers (e.g., "Aisle 1, Rack 5", "Receiving Dock", "High-Value Goods Cage").
    - Reject gibberish (e.g., "asdfghjkl"), full sentences that are not descriptive names, questions, or text with excessive special symbols.
    
    Input text: "${name}"
    
    Return a JSON object with two keys: "isValid" (boolean) and "reason" (a brief string explaining why it's invalid, or an empty string if valid).
  `;

  try {
    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
            },
            reason: {
              type: Type.STRING,
            }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini API for location name validation.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error validating location name:", error);
    // Fail open
    return { isValid: true, reason: "AI validation failed." };
  }
};

export const analyzePricingLogic = async (log: string): Promise<string> => {
    const prompt = `
    You are a helpful debugging assistant for a warehouse management system.
    The following is a step-by-step log of a pricing calculation for items in an order.
    Analyze the log and provide a concise, one or two-sentence summary explaining the final result.
    Focus on *why* a discount was or was not applied.

    Example anaysis: "The final price for 'Test Product' was not discounted because although a pricing rule was found, the order quantity of 5 did not meet the rule's minimum quantity of 10."
    Another example: "The final price for 'Another Product' was discounted by 15% because it successfully met all conditions of the 'Bulk Discount' rule."

    Here is the log:
    ---
    ${log}
    ---
    
    Provide your summary:
    `;

    try {
        // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks according to guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error analyzing pricing logic:", error);
        return "Could not get AI analysis at this time.";
    }
};
