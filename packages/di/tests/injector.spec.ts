import 'reflect-metadata';
import { Injector } from '../src/injector';
import { Inject } from '../src/inject';
import { ServiceIdentifierNotFoundError } from '../src/errors/service-identifier-not-found';
import { DependencyProviderNotFoundError } from '../src/errors';

class Test {}

describe('Injector', () => {
  describe('get', () => {
    it('should resolve a value', () => {
      const injector = new Injector({
        initialProviders: [
          {
            useValue: true,
            provide: 'value',
          },
        ],
      });

      expect(injector.get('value')).toEqual(true);
    });

    it('should resolve a class', () => {
      const injector = new Injector({
        initialProviders: [
          {
            useClass: Test,
            provide: Test,
          },
        ],
      });

      expect(injector.get(Test)).toBeInstanceOf(Test);
    });

    it('should resolve a factory', () => {
      const factory = jest.fn().mockReturnValue(true);
      const injector = new Injector({
        initialProviders: [
          {
            useFactory: factory,
            provide: Test,
          },
        ],
      });

      expect(injector.get(Test)).toBe(true);
      expect(factory).toHaveBeenCalledWith(injector);
    });

    it('should cache resolved values', () => {
      const injector = new Injector({
        initialProviders: [Test],
      });

      const test = injector.get(Test);
      expect(test).toBeInstanceOf(Test);
      expect(test).toBe(injector.get(Test));
    });

    it('should resolve constructor dependencies', () => {
      class Test2 {
        constructor(@Inject(Test) readonly dep: Test) {}
      }

      const injector = new Injector({
        initialProviders: [
          {
            useClass: Test,
            provide: Test,
          },
          {
            useClass: Test2,
            provide: Test2,
          },
        ],
      });

      const test2 = injector.get(Test2);
      expect(test2).toBeInstanceOf(Test2);
      expect(test2.dep).toBeInstanceOf(Test);
    });

    it('should throw an error if unable to resolve constructor dependency', () => {
      class Test2 {
        constructor(@Inject(Test) readonly dep: Test) {}
      }

      const injector = new Injector({
        name: 'Parent',
        initialProviders: [
          {
            useClass: Test2,
            provide: Test2,
          },
        ],
      });

      expect(() => injector.get(Test2)).toThrow(new DependencyProviderNotFoundError(Test, Test2, 'Parent', 0));
    });

    it('should resolve property dependencies', () => {
      class Test2 {
        constructor() {}

        @Inject(Test) private dep: Test;
      }

      const injector = new Injector({
        initialProviders: [
          {
            useClass: Test,
            provide: Test,
          },
          {
            useClass: Test2,
            provide: Test2,
          },
        ],
      });

      const test2 = injector.get(Test2);
      expect(test2).toBeInstanceOf(Test2);
      expect(test2.dep).toBeInstanceOf(Test);
    });

    it('should throw an error if unable to resolve property dependency', () => {
      class Test2 {
        @Inject(Test) readonly dep: Test;
      }

      const injector = new Injector({
        name: 'Parent',
        initialProviders: [
          {
            useClass: Test2,
            provide: Test2,
          },
        ],
      });

      expect(() => injector.get(Test2)).toThrow(new DependencyProviderNotFoundError(Test, Test2, 'Parent', 0));
    });

    it('should resolve a child dependency', () => {
      const injector = new Injector({
        children: [
          new Injector<any>({
            initialProviders: [
              {
                useClass: Test,
                provide: Test,
              },
            ],
          }),
        ],
      });

      expect(injector.get(Test)).toBeInstanceOf(Test);
    });

    it('should throw an error if unable to resolve dependency in children', () => {
      const injector = new Injector({
        name: 'Parent',
        children: [
          new Injector<any>({
            name: 'Child',
            initialProviders: [],
          }),
        ],
      });

      expect(() => injector.get(Test)).toThrow(new ServiceIdentifierNotFoundError(Test, 'Parent'));
    });

    it('should handle errors thrown in factory in child module', () => {
      const injector = new Injector({
        name: 'Parent',
        children: [
          new Injector<any>({
            name: 'Child',
            initialProviders: [
              {
                provide: 'test',
                useFactory(injector: Injector) {
                  injector.get('test2');
                },
              },
            ],
          }),
        ],
      });

      expect(() => injector.get('test')).toThrow(new ServiceIdentifierNotFoundError('test2', 'Child'));
    });
  });
});
