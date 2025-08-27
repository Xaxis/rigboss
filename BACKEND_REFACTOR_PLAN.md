# Backend Architecture Refactor Plan

## Current Problems
- **Monolithic server.ts** (445 lines) handling everything
- **Mixed responsibilities** - HTTP routes, Socket.IO, polling, service management
- **No clear service boundaries** - everything in one file
- **Poor separation of concerns** - business logic mixed with transport layer
- **No standardized interfaces** - inconsistent API patterns
- **Hard to test** - tightly coupled components
- **No service discovery** - frontend hardcodes service endpoints

## New Modular Architecture

### Core Services Layer
```
backend/
├── server.ts                 # Main entry point (orchestration only)
├── config/
│   └── index.ts             # Centralized configuration
├── services/
│   ├── RadioService.ts      # Radio control & state management
│   ├── AudioService.ts      # Audio streaming & processing
│   ├── SpectrumService.ts   # Spectrum analysis & waterfall
│   └── ConfigService.ts     # Configuration management
├── transport/
│   ├── HttpTransport.ts     # REST API routes
│   ├── SocketTransport.ts   # Socket.IO namespaces
│   └── ServiceRegistry.ts   # Service discovery
├── interfaces/
│   ├── IRadioService.ts     # Radio service contract
│   ├── IAudioService.ts     # Audio service contract
│   └── ISpectrumService.ts  # Spectrum service contract
└── types/
    └── services.ts          # Service type definitions
```

### Service Responsibilities

#### RadioService
- **Purpose**: Radio control and state management
- **Responsibilities**:
  - Manage rigctld connection
  - Handle frequency/mode/power commands
  - Poll radio state
  - Emit state changes
- **Interface**: IRadioService
- **Endpoints**: `/api/radio/*`
- **Socket Namespace**: `/radio`

#### AudioService  
- **Purpose**: Audio streaming and processing
- **Responsibilities**:
  - Manage audio input/output
  - Stream PCM data
  - Handle audio levels
  - Process audio for spectrum
- **Interface**: IAudioService
- **Endpoints**: `/api/audio/*`
- **Socket Namespace**: `/audio`

#### SpectrumService
- **Purpose**: Spectrum analysis and waterfall
- **Responsibilities**:
  - Generate FFT data
  - Manage spectrum settings
  - Stream spectrum frames
  - Handle waterfall data
- **Interface**: ISpectrumService
- **Endpoints**: `/api/spectrum/*`
- **Socket Namespace**: `/spectrum`

#### ConfigService
- **Purpose**: Configuration management
- **Responsibilities**:
  - Load/save app configuration
  - Validate settings
  - Emit config changes
- **Interface**: IConfigService
- **Endpoints**: `/api/config/*`
- **Socket Namespace**: `/config`

### Transport Layer

#### HttpTransport
- **Purpose**: REST API routing
- **Responsibilities**:
  - Route HTTP requests to services
  - Handle authentication
  - Standardize response formats
  - Error handling

#### SocketTransport
- **Purpose**: Real-time communication
- **Responsibilities**:
  - Manage Socket.IO namespaces
  - Route events to services
  - Handle client connections
  - Broadcast service events

#### ServiceRegistry
- **Purpose**: Service discovery
- **Responsibilities**:
  - Register available services
  - Provide service metadata
  - Health checking
  - Dynamic service routing

### Standardized Interfaces

#### Service Interface Pattern
```typescript
interface IService {
  name: string;
  version: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): ServiceHealth;
  getCapabilities(): ServiceCapabilities;
}
```

#### API Response Pattern
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  service: string;
}
```

#### Socket Event Pattern
```typescript
interface SocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: number;
  service: string;
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create service interfaces and types
2. Implement ServiceRegistry
3. Create base Service class
4. Setup configuration system

### Phase 2: Extract Services
1. Extract RadioService from server.ts
2. Extract AudioService from server.ts
3. Create SpectrumService
4. Create ConfigService

### Phase 3: Transport Layer
1. Create HttpTransport with standardized routing
2. Create SocketTransport with namespaces
3. Implement service discovery endpoints

### Phase 4: Frontend Integration
1. Create frontend service clients
2. Implement service discovery on frontend
3. Update all frontend components to use new APIs
4. Remove hardcoded endpoints

### Phase 5: Testing & Documentation
1. Unit tests for all services
2. Integration tests for transport layer
3. API documentation
4. Service capability documentation

## Implementation Status

### ✅ MIGRATION COMPLETED
- **Core Infrastructure**: Service interfaces, types, base classes ✅
- **ServiceRegistry**: Service discovery and management ✅
- **Configuration System**: Environment-based config with validation ✅
- **RadioService**: Extracted from monolithic server.ts ✅
- **AudioService**: Extracted from WebRTCAudioService ✅
- **SpectrumService**: Created dedicated spectrum analysis service ✅
- **ConfigService**: Configuration management service ✅
- **HttpTransport**: REST API with standardized responses ✅
- **SocketTransport**: Complete Socket.IO namespace implementation ✅
- **Modular Server**: Replaced monolithic server.ts ✅
- **Legacy Compatibility**: Maintains existing frontend compatibility ✅
- **Frontend Updates**: Updated API endpoints for new backend ✅
- **Cleanup**: Removed old monolithic code ✅

### 🔧 IMMEDIATE FIXES APPLIED
- **Updated frontend API calls**: Changed `/api/connect` to `/api/radio/connect`
- **Fixed health check parsing**: Updated for new modular backend structure
- **Removed debug logging**: Cleaned up console spam
- **Backend URL configuration**: Fixed connection modal integration
- **Service orchestration**: All services properly registered and started

## Benefits Achieved
- **Modularity**: Each service has single responsibility
- **Testability**: Services can be tested in isolation
- **Scalability**: Services can be scaled independently
- **Maintainability**: Clear boundaries and interfaces
- **Flexibility**: Services can be swapped/upgraded independently
- **Discovery**: Frontend can dynamically discover available services
- **Consistency**: Standardized patterns across all services

## API Endpoints (New Architecture)

### Service Discovery
- `GET /api/services` - List all services
- `GET /api/services/:name` - Get service metadata
- `GET /api/health` - Overall health check

### Radio Service
- `POST /api/radio/connect` - Connect to rigctld
- `POST /api/radio/disconnect` - Disconnect from rigctld
- `GET /api/radio/state` - Get current radio state
- `POST /api/radio/frequency` - Set frequency
- `POST /api/radio/mode` - Set mode/bandwidth
- `POST /api/radio/power` - Set power level
- `POST /api/radio/ptt` - Set PTT state

### Socket.IO Namespaces
- `/` - Main namespace (service discovery, legacy compatibility)
- `/radio` - Radio-specific events
- `/audio` - Audio streaming events (planned)
- `/spectrum` - Spectrum analysis events (planned)

## Migration Path
1. **Phase 1**: Run modular server alongside existing server
2. **Phase 2**: Update frontend to use new APIs gradually
3. **Phase 3**: Complete service extraction (Audio, Spectrum)
4. **Phase 4**: Remove legacy server.ts
5. **Phase 5**: Optimize and add advanced features
