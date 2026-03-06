
import { describe, it, expect, jest } from '@jest/globals';
import { getProducts } from '@/api/inventoryApi'; // Use getProducts which internally uses mapProductFromAPI
import { apiClient } from '@/api/apiClient';
import { Product } from '@/types';

// Mock the apiClient
jest.mock('@/api/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Inventory API Logic', () => {
  describe('getProducts (and mapProductFromAPI)', () => {
    it('should map standard API product fields correctly from nested stringified JSON', async () => {
      const apiResponse = [{
          data: JSON.stringify([{
            productId: 101,
            productName: 'Test Product',
            sku: 'TEST-SKU-001',
            description: 'A test description.',
            categoryId: 5,
            fkSupplierId: 2,
            price: '99.99',
            reorderPoint: '10',
            imageUrl: 'http://example.com/image.png'
          }])
      }];

      mockedApiClient.post.mockResolvedValueOnce({ data: apiResponse });

      const products = await getProducts();
      
      const expectedProduct: Product = {
        id: '101',
        name: 'Test Product',
        sku: 'TEST-SKU-001',
        description: 'A test description.',
        categoryId: '5',
        supplierId: '2',
        price: 99.99,
        reorderPoint: 10,
        imageUrl: 'http://example.com/image.png',
        productCode: undefined,
        variants: [],
        packaging: undefined,
        pricingRuleId: undefined
      };

      expect(products).toHaveLength(1);
      expect(products[0]).toEqual(expectedProduct);
    });

    it('should handle missing or null fields gracefully', async () => {
      const apiResponse = [{
          data: JSON.stringify([{
            productId: 202,
            productName: 'Minimal Product',
            // all other fields are missing
          }])
      }];
      
      mockedApiClient.post.mockResolvedValueOnce({ data: apiResponse });

      const products = await getProducts();
      const mapped = products[0];
      
      expect(mapped.id).toBe('202');
      expect(mapped.name).toBe('Minimal Product');
      expect(mapped.price).toBe(0);
      expect(mapped.reorderPoint).toBe(0);
      expect(mapped.sku).toBe('');
      expect(mapped.supplierId).toBe('');
    });

    it('should parse a stringified JSON array for variants', async () => {
        const apiResponse = [{
            data: JSON.stringify([{
                productId: 303,
                productName: 'Variant Product',
                variants: '[{"id":"v1","name":"Color","value":"Red"},{"id":"v2","name":"Size","value":"M"}]'
            }])
        }];

        mockedApiClient.post.mockResolvedValueOnce({ data: apiResponse });
        
        const products = await getProducts();
        const mapped = products[0];

        expect(mapped.variants).toEqual([
            { id: 'v1', name: 'Color', value: 'Red' },
            { id: 'v2', name: 'Size', value: 'M' }
        ]);
    });

    it('should return an empty array if API response is malformed', async () => {
        // Example: response is not an array, or data property is not a string
        const malformedApiResponse = { message: "error" };
        mockedApiClient.post.mockResolvedValueOnce(malformedApiResponse as any);

        const products = await getProducts();
        expect(products).toEqual([]);
    });
  });
});
