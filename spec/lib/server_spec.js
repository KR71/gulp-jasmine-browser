import {Deferred, withUnhandledRejection} from '../spec_helper';
import request from 'supertest';
import {createServer} from '../../dist/lib/server';

describe('Server', function() {
  let app, files;
  beforeEach(function() {
    files = {
      'specRunner.html': 'The Spec Runner'
    };
  });

  describe('when the server is not passed options', function() {
    beforeEach(function() {
      app = createServer(files);
    });

    describe('GET /', function() {
      it.async('renders the spec runner', async function() {
        const res = await request(app).get('/').expect(200);
        expect(res.text).toContain('The Spec Runner');
      });
    });

    describe('GET *', function() {
      describe('with a file that exists', function() {
        beforeEach(function() {
          files['foo.js'] = 'Foo Content';
        });

        it.async('renders the file', async function() {
          const res = await request(app).get('/foo.js').expect(200);
          expect(res.text).toContain('Foo Content');
        });
      });

      describe('with a file that does not exist', function() {
        it.async('returns 404', async function() {
          const res = await request(app).get('/bar.js');
          expect(res.statusCode).toBe(404);
        });
      });
    });
  });

  describe('when the server is passed whenReady', function() {
    let whenReady;
    beforeEach(function() {
      whenReady = new Deferred();
      app = createServer(files, {whenReady: () => whenReady});
  });

    describe('GET /', function() {
      describe('whenReady is resolved', function() {
        it.async('renders the valid version of spec runner', async function() {
          setTimeout(function() {
            files['specRunner.html'] = 'The New Version';
            whenReady.resolve();
          }, 100);

          const res = await request(app).get('/').expect(200);
          expect(res.text).toContain('The New Version');
        });

        describe('when there is an error', () => {
          withUnhandledRejection();

          it.async('does not render intermediate invalid states', async function() {
            setTimeout(function() {
              files['specRunner.html'] = 'The Bad Version';
              whenReady.reject(new Error('some error'));
              whenReady = new Deferred();
            }, 100);

            setTimeout(function() {
              files['specRunner.html'] = 'The Good Version';
              whenReady.resolve();
            }, 200);

            const res = await request(app).get('/').expect(200);
            expect(res.text).toContain('The Good Version');
          });
        });

      });
    });
  });
});