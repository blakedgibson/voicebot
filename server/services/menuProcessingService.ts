import * as fs from 'fs';
import * as path from 'path';
import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProcessedMenuItem {
  name: string;
  price?: string;
  description?: string;
  category?: string;
  allergens?: string[];
  dietary?: string[];
}

export interface ProcessedMenuSection {
  name: string;
  items: ProcessedMenuItem[];
}

export interface ProcessedMenuData {
  sections: ProcessedMenuSection[];
  items: ProcessedMenuItem[];
  extractedText: string;
  processingMethod: 'pdf' | 'ocr';
  confidence: number;
}

export class MenuProcessingService {
  
  /**
   * Main entry point for processing uploaded menu files
   */
  async processMenuFile(file: Express.Multer.File): Promise<ProcessedMenuData> {
    console.log('🔍 Processing menu file:', file.originalname, 'Type:', file.mimetype);
    
    try {
      // Detect file type and extract text accordingly
      let extractedText: string;
      let processingMethod: 'pdf' | 'ocr';
      
      if (file.mimetype === 'application/pdf') {
        console.log('📄 Processing PDF file...');
        extractedText = await this.extractTextFromPDF(file.buffer);
        processingMethod = 'pdf';
      } else if (this.isImageFile(file.mimetype)) {
        console.log('🖼️ Processing image file with OCR...');
        extractedText = await this.extractTextFromImage(file.buffer);
        processingMethod = 'ocr';
      } else {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }
      
      console.log('📝 Extracted text length:', extractedText.length);
      console.log('📝 Text preview:', extractedText.substring(0, 200) + '...');
      
      // Convert extracted text to structured JSON using AI
      const structuredMenu = await this.convertToStructuredMenu(extractedText);
      
      return {
        ...structuredMenu,
        extractedText,
        processingMethod,
        confidence: this.calculateConfidence(structuredMenu)
      };
      
    } catch (error) {
      console.error('❌ Menu processing error:', error);
      throw new Error(`Failed to process menu file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      console.log('📄 Starting PDF text extraction, buffer size:', buffer.length);
      
      if (!buffer || buffer.length === 0) {
        throw new Error('PDF buffer is empty or undefined');
      }
      
      // Dynamic import to avoid module initialization issues
      const pdfParse = (await import('pdf-parse')).default;
      
      console.log('📄 Calling pdf-parse with buffer...');
      const data = await pdfParse(buffer, {
        // Explicitly pass buffer and prevent any file system access
        max: 0, // No limit on pages
        version: 'v1.10.100' // Use stable version
      });
      
      if (!data || !data.text) {
        throw new Error('PDF parsing succeeded but no text was extracted');
      }
      
      console.log('✅ PDF text extracted successfully, length:', data.text.length);
      return data.text;
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      
      // Enhanced error details for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extract text from image using Tesseract OCR
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    const worker = await createWorker();
    
    try {
      console.log('🔤 Starting OCR processing...');
      
      // Properly initialize Tesseract worker
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Configure Tesseract for better menu text recognition
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz $.,()-:&/',
        tessedit_pageseg_mode: 6, // Assume uniform block of text
      });
      
      const { data: { text } } = await worker.recognize(buffer);
      
      console.log('✅ OCR completed');
      return text;
      
    } catch (error) {
      console.error('❌ OCR error:', error);
      throw new Error('Failed to extract text from image');
    } finally {
      await worker.terminate();
    }
  }
  
  /**
   * Convert extracted text to structured menu using Gemini AI
   */
  private async convertToStructuredMenu(text: string): Promise<{sections: ProcessedMenuSection[], items: ProcessedMenuItem[]}> {
    try {
      console.log('🤖 Converting text to structured menu...');
      
      const prompt = `
You are a menu parsing expert. Convert the following menu text into a structured JSON format.

IMPORTANT INSTRUCTIONS:
1. Parse the menu into logical sections (appetizers, mains, desserts, beverages, etc.)
2. Extract individual menu items with names, prices, and descriptions
3. Identify common allergens (nuts, dairy, gluten, etc.)
4. Identify dietary information (vegetarian, vegan, gluten-free, etc.)
5. Clean up any OCR errors or formatting issues
6. If prices are missing, set them as null
7. Group similar items into appropriate categories

Return ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "price": "$XX.XX or null",
          "description": "Item description",
          "category": "section name",
          "allergens": ["allergen1", "allergen2"],
          "dietary": ["vegetarian", "vegan", "gluten-free"]
        }
      ]
    }
  ],
  "items": [
    // Flattened array of all items from all sections
  ]
}

Menu text to parse:
${text}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      const rawJson = response.text || '';
      console.log('🤖 AI response received');
      
      if (!rawJson) {
        throw new Error('Empty response from AI model');
      }

      // Clean the response to extract just the JSON
      let cleanJson = rawJson.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedMenu = JSON.parse(cleanJson);
      
      // Validate the response structure with better error handling
      if (!parsedMenu || typeof parsedMenu !== 'object') {
        throw new Error('Invalid menu structure: response is not an object');
      }
      
      if (!parsedMenu.sections || !Array.isArray(parsedMenu.sections)) {
        throw new Error('Invalid menu structure: missing sections array');
      }

      // Ensure items array exists, create it if not present
      if (!parsedMenu.items || !Array.isArray(parsedMenu.items)) {
        console.log('⚠️ Items array missing, creating from sections');
        parsedMenu.items = [];
        parsedMenu.sections.forEach((section: any) => {
          if (section.items && Array.isArray(section.items)) {
            parsedMenu.items.push(...section.items);
          }
        });
      }
      
      console.log('✅ Menu structured successfully:', {
        sections: parsedMenu.sections.length,
        totalItems: parsedMenu.items.length
      });
      
      return parsedMenu;
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      
      // Enhanced fallback: attempt basic heuristic parsing before giving up
      const fallbackItems = this.createHeuristicMenuItems(text);
      
      return {
        sections: [{
          name: 'Menu Items',
          items: fallbackItems
        }],
        items: fallbackItems
      };
    }
  }

  /**
   * Create basic menu items using heuristic parsing when AI fails
   */
  private createHeuristicMenuItems(text: string): ProcessedMenuItem[] {
    const fallbackItems: ProcessedMenuItem[] = [];
    
    // Try to find lines that look like menu items (contain prices or are formatted like items)
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 3);
    
    for (const line of lines) {
      // Look for lines with price patterns ($X.XX, $X, etc.)
      const priceMatch = line.match(/\$\d+(?:\.\d{2})?/);
      if (priceMatch) {
        const nameEndIndex = line.indexOf(priceMatch[0]);
        const name = line.substring(0, nameEndIndex).trim();
        const remainder = line.substring(nameEndIndex + priceMatch[0].length).trim();
        
        if (name.length > 1) {
          fallbackItems.push({
            name: name,
            price: priceMatch[0],
            description: remainder.length > 0 ? remainder : undefined,
            category: 'Menu Items',
            allergens: [],
            dietary: []
          });
        }
      }
    }
    
    // If no price-based items found, create a single item with the text
    if (fallbackItems.length === 0) {
      fallbackItems.push({
        name: 'Menu (requires manual review)',
        description: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
        category: 'General',
        allergens: [],
        dietary: []
      });
    }
    
    return fallbackItems;
  }
  
  /**
   * Check if the file is an image
   */
  private isImageFile(mimetype: string): boolean {
    const imageTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];
    return imageTypes.includes(mimetype);
  }
  
  /**
   * Calculate confidence score based on the structured data quality
   */
  private calculateConfidence(menu: {sections: ProcessedMenuSection[], items: ProcessedMenuItem[]}): number {
    if (!menu.sections.length) return 0.1;
    
    let score = 0.5; // Base score
    
    // Add points for having multiple sections
    if (menu.sections.length > 1) score += 0.1;
    if (menu.sections.length > 3) score += 0.1;
    
    // Add points for items with prices
    const itemsWithPrices = menu.items.filter(item => item.price);
    if (itemsWithPrices.length > 0) {
      score += (itemsWithPrices.length / menu.items.length) * 0.2;
    }
    
    // Add points for items with descriptions
    const itemsWithDescriptions = menu.items.filter(item => item.description && item.description.length > 10);
    if (itemsWithDescriptions.length > 0) {
      score += (itemsWithDescriptions.length / menu.items.length) * 0.1;
    }
    
    return Math.min(1.0, score);
  }
}