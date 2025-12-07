-- Insert Las Islas menu data for all three locations
-- Salem: db13af19-9aca-4711-b715-1020e0569865
-- Woodburn: bf829503-41cd-47a2-94b9-638c889e8d7f
-- Portland: 1086e75e-0ce5-4cdb-8225-a0e108bf97b2

-- First, delete any existing menu sections/items for these restaurants to avoid duplicates
DELETE FROM menu_items WHERE section_id IN (
  SELECT id FROM menu_sections WHERE restaurant_id IN (
    'db13af19-9aca-4711-b715-1020e0569865',
    'bf829503-41cd-47a2-94b9-638c889e8d7f',
    '1086e75e-0ce5-4cdb-8225-a0e108bf97b2'
  )
);
DELETE FROM menu_sections WHERE restaurant_id IN (
  'db13af19-9aca-4711-b715-1020e0569865',
  'bf829503-41cd-47a2-94b9-638c889e8d7f',
  '1086e75e-0ce5-4cdb-8225-a0e108bf97b2'
);

-- Helper function to insert menu for a restaurant
DO $$
DECLARE
  r_salem UUID := 'db13af19-9aca-4711-b715-1020e0569865';
  r_woodburn UUID := 'bf829503-41cd-47a2-94b9-638c889e8d7f';
  r_portland UUID := '1086e75e-0ce5-4cdb-8225-a0e108bf97b2';
  restaurant_ids UUID[] := ARRAY[r_salem, r_woodburn, r_portland];
  r_id UUID;
  s_id UUID;
BEGIN
  FOREACH r_id IN ARRAY restaurant_ids LOOP
    -- Section 1: Bebidas / Drinks
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🥤 Bebidas / Drinks', 0) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Aguas Frescas', 'Horchata • Tamarindo • Limón • Jamaica • Piña', '$4.50', 0),
      (s_id, 'Limonada', 'Natural o mineral', '$8.50', 1),
      (s_id, 'Fuente de Sodas', 'Coca • Diet Coke • Sprite • Fanta • Pink Lemonade', '$4.50', 2),
      (s_id, 'Refrescos de México', 'Coca Cola • Sangría • Sidral • Jarritos (Tamarindo, Mandarina, Agua Mineral)', '$4.99', 3),
      (s_id, 'Cerveza Nacional', 'Bud Light • Budweiser • Miller Light • Coors Light', '$5.50', 4),
      (s_id, 'Cerveza Importada', 'Corona • Modelo Especial • Negra Modelo • Victoria • Pacífico • Dos XX • Bohemia • Tecate • Tecate Light • Heineken', '$6.99', 5),
      (s_id, 'Micheladas', NULL, '$12.99', 6),
      (s_id, 'Micheladas V.I.P.', NULL, '$18.99', 7),
      (s_id, 'Margaritas', 'Mango • Fresa • Limón', '$12.99', 8),
      (s_id, 'Piña Colada', NULL, '$12.99', 9),
      (s_id, 'Margarita Toro', NULL, '$30.99', 10),
      (s_id, 'Cantarito', NULL, '$15.99', 11),
      (s_id, 'Cantarito Especial', 'Patrón • Don Julio', '$18.99', 12),
      (s_id, 'Margarona', NULL, '$22.00', 13),
      (s_id, 'Paloma', NULL, '$14.50', 14),
      (s_id, 'Paloma Especial', 'Patrón • Don Julio', '$18.99', 15),
      (s_id, 'Margarita Flight', NULL, '$26.99', 16),
      (s_id, 'Tequila Blanco (shot)', NULL, '$13.99', 17),
      (s_id, 'Tequila Reposado (shot)', NULL, '$13.50', 18),
      (s_id, 'Tequila Añejo (shot)', NULL, '$15.99', 19),
      (s_id, 'Don Julio 70 (shot)', NULL, '$18.99', 20),
      (s_id, 'Don Julio 42 (shot)', NULL, '$39.99', 21),
      (s_id, 'Clase Azul (shot)', NULL, '$34.99', 22);

    -- Section 2: Appetizers
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🥟 Appetizers', 1) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Piquete de Ojo', 'Shrimp, scallops, octopus & oyster sautéed in lemon & house red sauce', '$33.99', 0),
      (s_id, 'Ostiones en su Concha (1/2 doz)', NULL, '$15.99', 1),
      (s_id, 'Ostiones en su Concha (1 doz)', NULL, '$26.99', 2),
      (s_id, 'Ostiones Especiales (1/2 doz)', 'Topped with boiled shrimp, octopus, cucumber, tomato & onion', '$18.92', 3),
      (s_id, 'Ostiones Especiales (1 doz)', 'Topped with boiled shrimp, octopus, cucumber, tomato & onion', '$33.99', 4),
      (s_id, 'Juguito Mendigo', 'Shrimp broth with onion, cilantro, avocado, serrano & head-on shrimp', '$12.99', 5),
      (s_id, 'Balazos Ostión (1/2 doz)', NULL, '$21.99', 6),
      (s_id, 'Balazos Ostión (1 doz)', NULL, '$33.99', 7),
      (s_id, 'Pulpitos', NULL, NULL, 8),
      (s_id, 'House Fries', NULL, '$29.99', 9),
      (s_id, 'Guacamole', NULL, '$11.99', 10);

    -- Section 3: Tacos y Empanadas
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🌮 Tacos y Empanadas', 2) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Empanadas de Camarón (6)', 'Shrimp pastries', '$17.99', 0),
      (s_id, 'Empanadas de Camarón (12)', NULL, '$33.99', 1),
      (s_id, 'Empanadas de Camarón y Queso (6/12)', NULL, 'Reg $18.99 • Lrg $34.99', 2),
      (s_id, 'Tacos de Camarón (1)', 'Shrimp taco', '$7.50', 3),
      (s_id, 'Tacos de Pescado (1)', 'Fish taco', '$6.99', 4),
      (s_id, 'Combo Tacos de Pollo (2)', 'Chicken tacos combo', '$9.99', 5),
      (s_id, 'Combo Tacos de Asada (2)', 'Steak tacos combo', '$11.99', 6),
      (s_id, 'Combo Tacos Gobernador (3)', NULL, '$18.25', 7);

    -- Section 4: Botanas y Ensaladas
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🦪 Botanas y Ensaladas', 3) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Mejillones', 'Mussels cooked in our spicy house sauce', '$34.50', 0),
      (s_id, 'Langostinos', 'Fresh water prawns in our spicy house sauce', '$35.50', 1),
      (s_id, 'Mejillones / Langostinos', 'Mussels & prawns in our spicy house sauce', '$33.50', 2),
      (s_id, 'Camarones Encabronados', 'Shrimp with a combination of spicy peppers', '$33.50', 3),
      (s_id, 'Camarones a la Cucaracha', 'Head-on shrimp cooked in our spicy sauce', '$33.99', 4),
      (s_id, 'Camarones al Vapor', 'Head-on shrimp boiled & marinated with special seasoning', '$31.99', 5),
      (s_id, 'Aguachile Rojo', 'Shrimp sautéed in lemon — red sauce', '$33.50', 6),
      (s_id, 'Aguachile Verde', 'Shrimp sautéed in lemon — green sauce', '$33.50', 7),
      (s_id, 'Aguachile Negro', 'Shrimp sautéed in lemon — black sauce', '$33.50', 8);

    -- Section 5: Ceviches y Aguachiles
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍤 Ceviches y Aguachiles', 4) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Pescado', 'Fish ceviche', '$22.25', 0),
      (s_id, 'Camarón', 'Shrimp ceviche', '$24.99', 1),
      (s_id, 'Mixto', '½ fish • ½ shrimp', '$24.99', 2),
      (s_id, 'Camarón y Pulpo', 'Shrimp ceviche with octopus (cooked or not cooked)', '$26.50', 3),
      (s_id, 'Poca Madre', 'Uncooked & cooked shrimp, octopus & scallops', '$29.50', 4);

    -- Section 6: Tostadas
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🥗 Tostadas', 5) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Mixtas', NULL, '$13.99', 0),
      (s_id, 'Ceviche de Camarón', 'Shrimp ceviche', '$11.99', 1),
      (s_id, 'Ceviche de Pescado', 'Fish ceviche', '$10.99', 2),
      (s_id, 'Ceviche de Jaiba (Imitación)', 'Crab imitation', '$9.99', 3),
      (s_id, 'Camarón Cocido', 'Steamed shrimp', '$14.99', 4),
      (s_id, 'Camarón con Pulpo', 'Octopus and steamed/raw shrimp', '$16.25', 5),
      (s_id, 'Ejecutiva', 'Camarón curtido, camarón cocido, pulpo y callo de hacha', '$20.99', 6),
      (s_id, 'Aguachile Negro', NULL, NULL, 7);

    -- Section 7: Cocteles Estilo Nayarit
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍹 Cocteles Estilo Nayarit', 6) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Camarón', 'Shrimp cocktail', 'Reg $19.50 • Lrg $23.50', 0),
      (s_id, 'Camarón y Pulpo', 'Shrimp & octopus cocktail', 'Reg $21.50 • Lrg $24.50', 1),
      (s_id, 'Campechana', 'Octopus, clam meat, imitation crab, shrimp & imitation abalone', '$24.50', 2),
      (s_id, 'Vuelve la Vida', 'Octopus, clam meat, imitation crab, shrimp, imitation abalone & oyster', '$26.50', 3),
      (s_id, 'Levanta Muertos', 'Boiled shrimp, scallops, oysters, baby clams & octopus', '$26.50', 4);

    -- Section 8: Especialidades
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍽️ Especialidades', 7) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Pasta Costa Brava', 'Shrimp, mussels & pasta', '$25.99', 0),
      (s_id, 'Molcajete Cora', NULL, '$40.99', 1),
      (s_id, 'Momias Cora', 'Bacon-wrapped shrimp topped with cheese', '$24.99', 2),
      (s_id, 'Camarones Zarandeados', 'Giant shrimp grilled with spicy & sweet sauce', '$33.99', 3),
      (s_id, 'Mariscada (para 4)', 'Variety of seafood — recommended for 4 people', '$92.99', 4),
      (s_id, 'Chicharrón de Pescado', 'Battered fish with house sauce', '$26.99', 5),
      (s_id, 'Patas de Jaiba', 'Crab legs', '$45.50', 6),
      (s_id, 'Botana Louisiana', NULL, '$41.25', 7),
      (s_id, 'Salmón', NULL, '$26.99', 8),
      (s_id, 'Camarones Chicago', NULL, '$38.99', 9);

    -- Section 9: Caldos
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍲 Caldos', 8) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Filete de Pescado', 'Basa filet soup', '$21.99', 0),
      (s_id, 'Camarón', 'Unpeeled shrimp soup', '$25.99', 1),
      (s_id, 'Camarón y Pulpo', 'Unpeeled shrimp & octopus soup', '$27.50', 2),
      (s_id, 'Camarón, Pulpo y Abulón', 'Shrimp, octopus & abalone soup', '$27.99', 3),
      (s_id, 'Langostinos', 'Large lobster shrimp soup', '$26.99', 4),
      (s_id, '7 Mares', 'Crab legs, mussels, head-on shrimp, octopus, clam meat, imitation abalone & boiled shrimp', '$27.99', 5);

    -- Section 10: Platillos
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍽️ Platillos', 9) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Camarones — A la Diabla', 'Shrimp of your choice served with rice & salad', '$24.50', 0),
      (s_id, 'Camarones — Al Mojo de Ajo', NULL, '$24.50', 1),
      (s_id, 'Camarones — Rancheros', NULL, '$24.50', 2),
      (s_id, 'Camarones — Empanizados', NULL, '$24.50', 3),
      (s_id, 'Camarones — A la Cucaracha', NULL, '$24.50', 4),
      (s_id, 'Camarones — A la Mantequilla', NULL, '$24.50', 5),
      (s_id, 'Camarones — A la Veracruzana', NULL, '$24.50', 6),
      (s_id, 'Langostinos', NULL, '$27.99', 7),
      (s_id, 'Zarandeados (Camarón)', NULL, '$28.99', 8),
      (s_id, 'Pulpo — Al Mojo de Ajo', 'Octopus served with rice & salad', 'Market Price', 9),
      (s_id, 'Pulpo — Rancheros', NULL, 'Market Price', 10),
      (s_id, 'Pulpo — A la Diabla', NULL, 'Market Price', 11),
      (s_id, 'Mojarra Frita — Al Natural', 'Fried tilapia served with rice, beans & salad', '$23.99', 12),
      (s_id, 'Mojarra Frita — A la Diabla', NULL, '$23.99', 13),
      (s_id, 'Mojarra Frita — Al Mojo de Ajo', NULL, '$23.99', 14),
      (s_id, 'Filete Basa — A la Plancha', 'Tilapia fillet served with rice, beans & salad', '$23.99', 15),
      (s_id, 'Filete Basa — A la Diabla', NULL, '$23.99', 16),
      (s_id, 'Filete Basa — A la Veracruzana', NULL, '$23.99', 17),
      (s_id, 'Filete Basa — Empanizado', NULL, '$23.99', 18),
      (s_id, 'Filete Basa — Al Mojo de Ajo', NULL, '$23.99', 19);

    -- Section 11: Fajitas
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🌯 Fajitas', 10) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Pollo', 'Chicken fajitas', '$23.99', 0),
      (s_id, 'Res', 'Steak fajitas', '$24.99', 1),
      (s_id, 'Mixtas', 'Steak & chicken fajitas', '$25.99', 2),
      (s_id, 'Camarón', 'Shrimp fajitas', '$24.99', 3),
      (s_id, 'Especiales', 'Steak, chicken & shrimp fajitas', '$26.99', 4);

    -- Section 12: Pollo y Carne
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🥩 Pollo y Carne', 11) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Carne Asada', 'Skirt steak cooked on the grill', '$24.99', 0),
      (s_id, 'Carne Asada con Camarones', 'Skirt steak on the grill with shrimp', '$28.99', 1),
      (s_id, 'Pechuga de Pollo a la Plancha', 'Chicken breast grilled, marinated with adobo sauce', '$21.25', 2),
      (s_id, 'Pechuga de Pollo al Chipotle', 'Chicken breast in chipotle sauce, topped with cheese', '$22.99', 3),
      (s_id, 'Alambre de Pollo', 'Chicken with bell peppers, onion & bacon; topped with cheese', '$18.99', 4),
      (s_id, 'Alambre de Res', 'Steak with bell peppers, onion & bacon; topped with cheese', '$20.99', 5),
      (s_id, 'Molcajete Azteca (para 2)', 'Steak, chicken, shrimp, chorizo, queso fresco, onion, jalapeño, cactus & special sauce', '$41.50', 6);

    -- Section 13: Kids
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '👶 Kids', 12) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Chicken Nuggets', NULL, '$9.99', 0),
      (s_id, 'Quesadilla con Pollo', NULL, '$10.99', 1),
      (s_id, 'Quesadilla con Carne', NULL, '$12.99', 2),
      (s_id, 'Quesadilla con Camarón', NULL, '$12.99', 3),
      (s_id, 'Quesadilla (Cheese)', NULL, '$7.50', 4),
      (s_id, 'Queso Fundido', NULL, '$11.99', 5),
      (s_id, 'Queso Fundido con Camarón', NULL, '$13.50', 6),
      (s_id, 'Hamburger', NULL, '$7.99', 7),
      (s_id, 'Cheeseburger', NULL, '$9.99', 8);

    -- Section 14: Órdenes Extras
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '➕ Órdenes Extras', 13) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Ensalada', 'Salad', '$5.99', 0),
      (s_id, 'Papas Fritas', 'French fries', '$6.50', 1),
      (s_id, 'Arroz', 'Rice', '$5.99', 2),
      (s_id, 'Frijoles', 'Beans', '$5.99', 3),
      (s_id, 'Chips and Salsa', NULL, '$4.99', 4),
      (s_id, 'Aguacate', 'Avocado', '$5.50', 5),
      (s_id, 'Guacamole', NULL, '$11.99', 6),
      (s_id, 'Salsa roja o verde', NULL, '$3.50', 7);

    -- Section 15: Postres
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🍮 Postres', 14) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Flan', NULL, '$7.99', 0),
      (s_id, 'Churros', NULL, '$7.99', 1),
      (s_id, 'Platanitos Fritos', NULL, '$7.99', 2),
      (s_id, 'Cheesecake', NULL, '$7.99', 3);

    -- Section 16: Charolas de Ceviche
    INSERT INTO menu_sections (restaurant_id, name, sort_order) VALUES (r_id, '🥗 Charolas de Ceviche — Ceviche Party Trays', 15) RETURNING id INTO s_id;
    INSERT INTO menu_items (section_id, name, description, price, sort_order) VALUES
      (s_id, 'Pescado — Media Charola', 'Half size tray', '$65.99', 0),
      (s_id, 'Pescado — Charola Completa', 'Full size tray', '$127.99', 1),
      (s_id, 'Camarón — Media Charola', 'Half size tray', '$75.99', 2),
      (s_id, 'Camarón — Charola Completa', 'Full size tray', '$147.99', 3),
      (s_id, 'Poca Madre — Media Charola', 'Cam. crudo, cam. cocido, pulpo y callo de hacha', '$88.99', 4),
      (s_id, 'Poca Madre — Charola Completa', 'Cam. crudo, cam. cocido, pulpo y callo de hacha', '$160.00', 5);

  END LOOP;
END $$;