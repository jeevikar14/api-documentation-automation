'use strict';

const scannerModule = require('sonarqube-scanner');
const scanner = scannerModule.default || scannerModule.scan;

const serverUrl = 'http://localhost:9000';
const token = process.env.SONAR_TOKEN;

scanner(
  {
    serverUrl,
    token,
    options: {
      'sonar.projectKey': 'api-documentation-automation',
      'sonar.projectName': 'api-documentation-automation',
      'sonar.projectVersion': '1.1.0',
      'sonar.sourceEncoding': 'UTF-8',
      'sonar.sources': 'src',
      'sonar.tests': 'test',
      'sonar.test.inclusions': 'test/**/*.js',
      'sonar.exclusions': [
        'node_modules/**',
        'samples/**',
        'index.js',
        'sonar-project.js',
      ].join(','),
      'sonar.coverage.exclusions': [
        'test/**',
        'samples/**',
      ].join(','),
    },
  },
  () => process.exit()
);
