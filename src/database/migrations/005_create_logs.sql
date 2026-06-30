CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    api_key_id UUID,

    level VARCHAR(20) NOT NULL,

    message TEXT NOT NULL,

    service VARCHAR(100),

    environment VARCHAR(50),

    metadata JSONB,

    trace_id VARCHAR(255),

    request_id VARCHAR(255),

    hostname VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (api_key_id)
        REFERENCES api_keys(id)
        ON DELETE SET NULL
);