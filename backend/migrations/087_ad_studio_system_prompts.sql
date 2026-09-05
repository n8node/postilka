-- +goose Up
-- +goose StatementBegin
CREATE TABLE ad_studio_system_prompts (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(32) NOT NULL CHECK (mode IN ('combine', 'reference_to_video', 'image_to_image', 'text_to_image', 'text_to_video', 'image_to_video')),
    scenario VARCHAR(32) NOT NULL CHECK (scenario IN ('default', 'product_only', 'avatar_only', 'both', 'none')),
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(mode, scenario)
);

-- Default prompts for combine mode
INSERT INTO ad_studio_system_prompts (mode, scenario, prompt_text) VALUES
('combine', 'both', 'TEMPLATE is image 1. Recreate its exact scene: background, setting, camera angle, lighting, composition, typography, and mood. PRODUCT is image 2, MODEL is image 3. Replace product and person in the template with these references. Preserve real shapes, materials, labels, colors, and model appearance. Keep all other elements unchanged.'),
('combine', 'product_only', 'TEMPLATE is image 1. Recreate its exact scene: background, setting, camera angle, lighting, composition, typography, and mood. PRODUCT is image 2. Replace only the product in the template with this reference. Preserve real shape, materials, labels, colors. Keep person and all other elements unchanged.'),
('combine', 'avatar_only', 'TEMPLATE is image 1. Recreate its exact scene: background, setting, camera angle, lighting, composition, typography, and mood. MODEL is image 2. Replace only the person in the template with this model. Preserve recognizable appearance. Keep product, background, composition unchanged. Do not add or replace any product.'),
('combine', 'none', 'TEMPLATE is image 1. Recreate its exact scene: background, setting, camera angle, lighting, composition, typography, and mood. No additional references. Recreate the template scene exactly. Do not invent products or models.'),
('reference_to_video', 'default', 'TEMPLATE is reference 1. Recreate that exact scene: background, setting, camera angle, lighting, composition, motion, typography, and mood. PRODUCT is image 2. Replace only the original product from the template with this product. Keep real shape, materials, labels, colors, proportions.'),
('image_to_image', 'default', 'Edit the uploaded product photo according to the template notes. Keep product identity, labels, and shape.'),
('text_to_image', 'default', 'Create advertising content from the template notes.'),
('text_to_video', 'default', 'Create advertising video content from the template notes.'),
('image_to_video', 'default', 'Create video from the uploaded product photo according to the template notes. Keep product identity, labels, and shape.');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ad_studio_system_prompts;
-- +goose StatementEnd
