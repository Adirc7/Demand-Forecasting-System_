# Demand Forecasting and Inventory Management System Test Cases
# IT2021 AIML Project
# Year/Sem2nd Year, Semester 2, 2026
# Assignment 3 
# DS-WE-Malabe-G19

This document outlines **360** detailed test cases spanning 6 completely independent organizational modules, distributed precisely among the 6 group members. Each member oversees 60 exact module test scenarios aligned to the official grading criteria.

## 📦 MODULE: User & Authentication Management
**Responsible Member:** Udawattha B. H. K. G.

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-001** | Sync the session cookie. | Database state updates correctly. |
| **TC-002** | Delete the registration form. | Operation persists on refresh. |
| **TC-003** | Delete the admin user approval. | Operation persists on refresh. |
| **TC-004** | Filter the password reset link. | Component processes logic without crash. |
| **TC-005** | Delete the admin user approval. | Component processes logic without crash. |
| **TC-006** | Read the registration form. | Data exported with valid layout. |
| **TC-007** | Filter the logout button. | Data exported with valid layout. |
| **TC-008** | Calculate the registration form. | Database state updates correctly. |
| **TC-009** | Filter the admin user approval. | Component processes logic without crash. |
| **TC-010** | Update the logout button. | Component processes logic without crash. |
| **TC-011** | Create the user roles table. | Database state updates correctly. |
| **TC-012** | Calculate the login form. | Database state updates correctly. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-013** | Test breadcrumbs for the password reset link. | Provides fluid visual transitions. |
| **TC-014** | Check responsiveness of the session cookie. | Layout does not break on mobile width. |
| **TC-015** | Navigate to the login form. | No dead clicks or user confusion. |
| **TC-016** | Navigate to the password reset link. | UX is intuitive and feedback is immediate. |
| **TC-017** | Test drag-and-drop on the registration form. | Provides fluid visual transitions. |
| **TC-018** | Verify scroll on the user roles table. | Layout does not break on mobile width. |
| **TC-019** | Check responsiveness of the registration form. | Provides fluid visual transitions. |
| **TC-020** | Check responsiveness of the registration form. | UX is intuitive and feedback is immediate. |
| **TC-021** | Verify scroll on the logout button. | No dead clicks or user confusion. |
| **TC-022** | Interact with the logout button. | Layout does not break on mobile width. |
| **TC-023** | Check loading state of the admin user approval. | Layout does not break on mobile width. |
| **TC-024** | Test breadcrumbs for the user roles table. | Action requires minimum steps. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-025** | Verify success toast on the logout button. | Inputs fail safely providing context. |
| **TC-026** | Trigger 404 error using the login form. | Follows established design system. |
| **TC-027** | Trigger 404 error using the logout button. | Follows established design system. |
| **TC-028** | Verify success toast on the admin user approval. | Follows established design system. |
| **TC-029** | Validate empty inputs on the registration form. | Follows established design system. |
| **TC-030** | Trigger 404 error using the login form. | No raw generic system errors exposed. |
| **TC-031** | Check typography on the admin user approval. | Inputs fail safely providing context. |
| **TC-032** | Validate empty inputs on the registration form. | Inputs fail safely providing context. |
| **TC-033** | Validate empty inputs on the session cookie. | Inputs fail safely providing context. |
| **TC-034** | Check typography on the registration form. | Follows established design system. |
| **TC-035** | Verify success toast on the registration form. | Inputs fail safely providing context. |
| **TC-036** | Check typography on the registration form. | Validations fire instantly. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-037** | Test XSS on the session cookie. | Prevents data leakage internally. |
| **TC-038** | Check session expiry on the password reset link. | CORS policy correctly handles request. |
| **TC-039** | Verify JWT token validation in the login form. | Prevents data leakage internally. |
| **TC-040** | Perform SQL Injection on the admin user approval. | CORS policy correctly handles request. |
| **TC-041** | Test XSS on the admin user approval. | Token is verfied successfully. |
| **TC-042** | Check session expiry on the password reset link. | Prevents data leakage internally. |
| **TC-043** | Inspect network payload on the session cookie. | CORS policy correctly handles request. |
| **TC-044** | Check session expiry on the logout button. | Denies request with 401/403. |
| **TC-045** | Perform SQL Injection on the admin user approval. | Prevents data leakage internally. |
| **TC-046** | Rate limit test the login form. | CORS policy correctly handles request. |
| **TC-047** | Verify JWT token validation in the login form. | Token is verfied successfully. |
| **TC-048** | Perform SQL Injection on the password reset link. | Prevents data leakage internally. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-049** | Review test coverage for the session cookie. | Code follows best design practices. |
| **TC-050** | Review code modularity for the password reset link. | Implementation isolated properly. |
| **TC-051** | Verify API latency for the admin user approval. | Completes within strict SLA thresholds. |
| **TC-052** | Review git commits for the user roles table. | Code follows best design practices. |
| **TC-053** | Verify API latency for the user roles table. | Completes within strict SLA thresholds. |
| **TC-054** | Verify API latency for the user roles table. | Warnings resolved systematically. |
| **TC-055** | Review git commits for the admin user approval. | Git commit history demonstrates atomic updates. |
| **TC-056** | Review code modularity for the logout button. | Code follows best design practices. |
| **TC-057** | Check error boundaries for the admin user approval. | Code follows best design practices. |
| **TC-058** | Check error boundaries for the session cookie. | Implementation isolated properly. |
| **TC-059** | Check error boundaries for the login form. | Git commit history demonstrates atomic updates. |
| **TC-060** | Review code modularity for the session cookie. | Completes within strict SLA thresholds. |

---

## 📦 MODULE: Product Management
**Responsible Member:** Abesundara N. S.

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-061** | Delete the product master list. | Data exported with valid layout. |
| **TC-062** | Export the category dropdown selector. | Operation persists on refresh. |
| **TC-063** | Calculate the category dropdown selector. | Operation persists on refresh. |
| **TC-064** | Create the pricing schema input. | Database state updates correctly. |
| **TC-065** | Filter the SKU input field. | Database state updates correctly. |
| **TC-066** | Create the category dropdown selector. | Database state updates correctly. |
| **TC-067** | Update the new product modal. | Data exported with valid layout. |
| **TC-068** | Read the SKU input field. | Data exported with valid layout. |
| **TC-069** | Create the category dropdown selector. | Operation persists on refresh. |
| **TC-070** | Read the new product modal. | Component processes logic without crash. |
| **TC-071** | Delete the new product modal. | Database state updates correctly. |
| **TC-072** | Sync the SKU input field. | Component processes logic without crash. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-073** | Verify scroll on the product image uploader. | No dead clicks or user confusion. |
| **TC-074** | Navigate to the product image uploader. | Provides fluid visual transitions. |
| **TC-075** | Verify scroll on the basic details form. | Action requires minimum steps. |
| **TC-076** | Interact with the delete product confirmation. | UX is intuitive and feedback is immediate. |
| **TC-077** | Test drag-and-drop on the product image uploader. | UX is intuitive and feedback is immediate. |
| **TC-078** | Navigate to the SKU input field. | Layout does not break on mobile width. |
| **TC-079** | Test drag-and-drop on the product master list. | No dead clicks or user confusion. |
| **TC-080** | Verify scroll on the new product modal. | Layout does not break on mobile width. |
| **TC-081** | Test drag-and-drop on the SKU input field. | Layout does not break on mobile width. |
| **TC-082** | Check responsiveness of the new product modal. | Action requires minimum steps. |
| **TC-083** | Check responsiveness of the product master list. | Layout does not break on mobile width. |
| **TC-084** | Test drag-and-drop on the pricing schema input. | UX is intuitive and feedback is immediate. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-085** | Test max limits on the SKU input field. | Follows established design system. |
| **TC-086** | Test max limits on the product image uploader. | Follows established design system. |
| **TC-087** | Test max limits on the product image uploader. | Validations fire instantly. |
| **TC-088** | Check color contrasts in the SKU input field. | Inputs fail safely providing context. |
| **TC-089** | Verify success toast on the delete product confirmation. | Inputs fail safely providing context. |
| **TC-090** | Input special characters to the product image uploader. | Inputs fail safely providing context. |
| **TC-091** | Validate empty inputs on the SKU input field. | Follows established design system. |
| **TC-092** | Check typography on the basic details form. | Follows established design system. |
| **TC-093** | Test max limits on the product image uploader. | No raw generic system errors exposed. |
| **TC-094** | Trigger 404 error using the SKU input field. | Follows established design system. |
| **TC-095** | Verify success toast on the basic details form. | Validations fire instantly. |
| **TC-096** | Input special characters to the pricing schema input. | Follows established design system. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-097** | Verify JWT token validation in the basic details form. | CORS policy correctly handles request. |
| **TC-098** | Attempt unauthorized access to the delete product confirmation. | CORS policy correctly handles request. |
| **TC-099** | Attempt unauthorized access to the SKU input field. | Payloads are strictly sanitized against attacks. |
| **TC-100** | Rate limit test the category dropdown selector. | Token is verfied successfully. |
| **TC-101** | Rate limit test the SKU input field. | CORS policy correctly handles request. |
| **TC-102** | Rate limit test the pricing schema input. | Token is verfied successfully. |
| **TC-103** | Test XSS on the new product modal. | Token is verfied successfully. |
| **TC-104** | Inspect network payload on the SKU input field. | CORS policy correctly handles request. |
| **TC-105** | Perform SQL Injection on the SKU input field. | CORS policy correctly handles request. |
| **TC-106** | Perform SQL Injection on the delete product confirmation. | Payloads are strictly sanitized against attacks. |
| **TC-107** | Rate limit test the category dropdown selector. | Prevents data leakage internally. |
| **TC-108** | Rate limit test the basic details form. | Token is verfied successfully. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-109** | Review test coverage for the category dropdown selector. | Git commit history demonstrates atomic updates. |
| **TC-110** | Review code modularity for the new product modal. | Git commit history demonstrates atomic updates. |
| **TC-111** | Check formatting rules for the SKU input field. | Git commit history demonstrates atomic updates. |
| **TC-112** | Review git commits for the basic details form. | Git commit history demonstrates atomic updates. |
| **TC-113** | Check formatting rules for the category dropdown selector. | Git commit history demonstrates atomic updates. |
| **TC-114** | Review code modularity for the SKU input field. | Warnings resolved systematically. |
| **TC-115** | Review code modularity for the SKU input field. | Code follows best design practices. |
| **TC-116** | Check error boundaries for the SKU input field. | Git commit history demonstrates atomic updates. |
| **TC-117** | Verify API latency for the delete product confirmation. | Completes within strict SLA thresholds. |
| **TC-118** | Review git commits for the product master list. | Completes within strict SLA thresholds. |
| **TC-119** | Check error boundaries for the delete product confirmation. | Implementation isolated properly. |
| **TC-120** | Review test coverage for the product image uploader. | Warnings resolved systematically. |

---

## 📦 MODULE: Inventory Management
**Responsible Member:** Bandara H. M. T. A

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-121** | Create the lead time setting. | Data exported with valid layout. |
| **TC-122** | Export the total warehouse value calculation. | Operation persists on refresh. |
| **TC-123** | Read the low stock threshold alert. | Operation persists on refresh. |
| **TC-124** | Read the total warehouse value calculation. | Database state updates correctly. |
| **TC-125** | Calculate the low stock threshold alert. | Operation persists on refresh. |
| **TC-126** | Delete the total warehouse value calculation. | Database state updates correctly. |
| **TC-127** | Update the lead time setting. | Data exported with valid layout. |
| **TC-128** | Update the total warehouse value calculation. | Database state updates correctly. |
| **TC-129** | Update the total warehouse value calculation. | Operation persists on refresh. |
| **TC-130** | Export the stock adjustment modal. | Data exported with valid layout. |
| **TC-131** | Calculate the low stock threshold alert. | Data exported with valid layout. |
| **TC-132** | Filter the stock adjustment modal. | Database state updates correctly. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-133** | Check responsiveness of the total warehouse value calculation. | UX is intuitive and feedback is immediate. |
| **TC-134** | Test breadcrumbs for the low stock threshold alert. | Layout does not break on mobile width. |
| **TC-135** | Interact with the stock adjustment modal. | No dead clicks or user confusion. |
| **TC-136** | Test breadcrumbs for the stock difference discrepancy. | Layout does not break on mobile width. |
| **TC-137** | Test drag-and-drop on the low stock threshold alert. | UX is intuitive and feedback is immediate. |
| **TC-138** | Check loading state of the stock adjustment modal. | Provides fluid visual transitions. |
| **TC-139** | Test drag-and-drop on the inventory metrics table. | Provides fluid visual transitions. |
| **TC-140** | Navigate to the lead time setting. | No dead clicks or user confusion. |
| **TC-141** | Verify scroll on the inventory metrics table. | Provides fluid visual transitions. |
| **TC-142** | Check loading state of the low stock threshold alert. | No dead clicks or user confusion. |
| **TC-143** | Check loading state of the lead time setting. | Provides fluid visual transitions. |
| **TC-144** | Test drag-and-drop on the lead time setting. | UX is intuitive and feedback is immediate. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-145** | Verify success toast on the lead time setting. | Validations fire instantly. |
| **TC-146** | Check color contrasts in the inventory CSV export. | Validations fire instantly. |
| **TC-147** | Check color contrasts in the inventory metrics table. | No raw generic system errors exposed. |
| **TC-148** | Check typography on the inventory CSV export. | Validations fire instantly. |
| **TC-149** | Check typography on the total warehouse value calculation. | Follows established design system. |
| **TC-150** | Check color contrasts in the low stock threshold alert. | No raw generic system errors exposed. |
| **TC-151** | Trigger 404 error using the stock adjustment modal. | Inputs fail safely providing context. |
| **TC-152** | Test max limits on the total warehouse value calculation. | No raw generic system errors exposed. |
| **TC-153** | Check color contrasts in the total warehouse value calculation. | Validations fire instantly. |
| **TC-154** | Check color contrasts in the low stock threshold alert. | Follows established design system. |
| **TC-155** | Test max limits on the low stock threshold alert. | Validations fire instantly. |
| **TC-156** | Check typography on the stock difference discrepancy. | Follows established design system. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-157** | Test XSS on the inventory CSV export. | Denies request with 401/403. |
| **TC-158** | Attempt unauthorized access to the stock adjustment modal. | Token is verfied successfully. |
| **TC-159** | Test XSS on the inventory metrics table. | CORS policy correctly handles request. |
| **TC-160** | Check session expiry on the total warehouse value calculation. | Payloads are strictly sanitized against attacks. |
| **TC-161** | Perform SQL Injection on the total warehouse value calculation. | Payloads are strictly sanitized against attacks. |
| **TC-162** | Verify JWT token validation in the inventory metrics table. | Prevents data leakage internally. |
| **TC-163** | Attempt unauthorized access to the stock adjustment modal. | Token is verfied successfully. |
| **TC-164** | Perform SQL Injection on the lead time setting. | Token is verfied successfully. |
| **TC-165** | Check session expiry on the low stock threshold alert. | Token is verfied successfully. |
| **TC-166** | Verify JWT token validation in the stock difference discrepancy. | Token is verfied successfully. |
| **TC-167** | Perform SQL Injection on the stock difference discrepancy. | Payloads are strictly sanitized against attacks. |
| **TC-168** | Attempt unauthorized access to the lead time setting. | CORS policy correctly handles request. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-169** | Check error boundaries for the total warehouse value calculation. | Git commit history demonstrates atomic updates. |
| **TC-170** | Review git commits for the stock adjustment modal. | Code follows best design practices. |
| **TC-171** | Review code modularity for the low stock threshold alert. | Completes within strict SLA thresholds. |
| **TC-172** | Review code modularity for the total warehouse value calculation. | Git commit history demonstrates atomic updates. |
| **TC-173** | Check error boundaries for the lead time setting. | Warnings resolved systematically. |
| **TC-174** | Review git commits for the inventory CSV export. | Git commit history demonstrates atomic updates. |
| **TC-175** | Review test coverage for the lead time setting. | Git commit history demonstrates atomic updates. |
| **TC-176** | Check formatting rules for the total warehouse value calculation. | Git commit history demonstrates atomic updates. |
| **TC-177** | Review git commits for the inventory metrics table. | Completes within strict SLA thresholds. |
| **TC-178** | Review code modularity for the stock difference discrepancy. | Implementation isolated properly. |
| **TC-179** | Check error boundaries for the inventory CSV export. | Git commit history demonstrates atomic updates. |
| **TC-180** | Review test coverage for the stock difference discrepancy. | Git commit history demonstrates atomic updates. |

---

## 📦 MODULE: Sales Management
**Responsible Member:** Abesekera A. W. A. D.

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-181** | Filter the receipt format generator. | Operation persists on refresh. |
| **TC-182** | Sync the daily sales summary widget. | Component processes logic without crash. |
| **TC-183** | Sync the transaction history. | Database state updates correctly. |
| **TC-184** | Read the daily sales summary widget. | Database state updates correctly. |
| **TC-185** | Filter the SKU point-of-sale autocompleter. | Operation persists on refresh. |
| **TC-186** | Sync the total price logic. | Data exported with valid layout. |
| **TC-187** | Sync the transaction history. | Operation persists on refresh. |
| **TC-188** | Export the total price logic. | Data exported with valid layout. |
| **TC-189** | Filter the sales return/reversal flow. | Operation persists on refresh. |
| **TC-190** | Update the total price logic. | Database state updates correctly. |
| **TC-191** | Export the SKU point-of-sale autocompleter. | Database state updates correctly. |
| **TC-192** | Create the transaction history. | Data exported with valid layout. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-193** | Test drag-and-drop on the receipt format generator. | UX is intuitive and feedback is immediate. |
| **TC-194** | Test breadcrumbs for the SKU point-of-sale autocompleter. | No dead clicks or user confusion. |
| **TC-195** | Test drag-and-drop on the sales return/reversal flow. | No dead clicks or user confusion. |
| **TC-196** | Interact with the sales entry form. | No dead clicks or user confusion. |
| **TC-197** | Check responsiveness of the sales return/reversal flow. | UX is intuitive and feedback is immediate. |
| **TC-198** | Interact with the sales return/reversal flow. | Provides fluid visual transitions. |
| **TC-199** | Test drag-and-drop on the SKU point-of-sale autocompleter. | Action requires minimum steps. |
| **TC-200** | Check loading state of the SKU point-of-sale autocompleter. | UX is intuitive and feedback is immediate. |
| **TC-201** | Interact with the sales return/reversal flow. | Action requires minimum steps. |
| **TC-202** | Navigate to the sales entry form. | UX is intuitive and feedback is immediate. |
| **TC-203** | Check responsiveness of the SKU point-of-sale autocompleter. | UX is intuitive and feedback is immediate. |
| **TC-204** | Verify scroll on the sales return/reversal flow. | Provides fluid visual transitions. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-205** | Trigger 404 error using the transaction history. | No raw generic system errors exposed. |
| **TC-206** | Verify success toast on the receipt format generator. | Follows established design system. |
| **TC-207** | Trigger 404 error using the receipt format generator. | Validations fire instantly. |
| **TC-208** | Test max limits on the transaction history. | Inputs fail safely providing context. |
| **TC-209** | Test max limits on the total price logic. | No raw generic system errors exposed. |
| **TC-210** | Check color contrasts in the SKU point-of-sale autocompleter. | No raw generic system errors exposed. |
| **TC-211** | Check typography on the sales entry form. | Inputs fail safely providing context. |
| **TC-212** | Test max limits on the sales entry form. | No raw generic system errors exposed. |
| **TC-213** | Test max limits on the sales return/reversal flow. | No raw generic system errors exposed. |
| **TC-214** | Trigger 404 error using the transaction history. | No raw generic system errors exposed. |
| **TC-215** | Trigger 404 error using the sales entry form. | Inputs fail safely providing context. |
| **TC-216** | Test max limits on the total price logic. | Validations fire instantly. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-217** | Check session expiry on the SKU point-of-sale autocompleter. | Denies request with 401/403. |
| **TC-218** | Inspect network payload on the sales entry form. | Token is verfied successfully. |
| **TC-219** | Perform SQL Injection on the total price logic. | Token is verfied successfully. |
| **TC-220** | Attempt unauthorized access to the receipt format generator. | Denies request with 401/403. |
| **TC-221** | Inspect network payload on the sales entry form. | Prevents data leakage internally. |
| **TC-222** | Perform SQL Injection on the sales return/reversal flow. | Denies request with 401/403. |
| **TC-223** | Verify JWT token validation in the sales entry form. | Token is verfied successfully. |
| **TC-224** | Check session expiry on the receipt format generator. | CORS policy correctly handles request. |
| **TC-225** | Verify JWT token validation in the SKU point-of-sale autocompleter. | Prevents data leakage internally. |
| **TC-226** | Perform SQL Injection on the receipt format generator. | Denies request with 401/403. |
| **TC-227** | Verify JWT token validation in the SKU point-of-sale autocompleter. | Denies request with 401/403. |
| **TC-228** | Attempt unauthorized access to the sales entry form. | Payloads are strictly sanitized against attacks. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-229** | Check formatting rules for the sales return/reversal flow. | Code follows best design practices. |
| **TC-230** | Audit console logs in the transaction history. | Implementation isolated properly. |
| **TC-231** | Review code modularity for the sales entry form. | Code follows best design practices. |
| **TC-232** | Check error boundaries for the sales entry form. | Git commit history demonstrates atomic updates. |
| **TC-233** | Audit console logs in the SKU point-of-sale autocompleter. | Warnings resolved systematically. |
| **TC-234** | Check error boundaries for the transaction history. | Git commit history demonstrates atomic updates. |
| **TC-235** | Review test coverage for the daily sales summary widget. | Git commit history demonstrates atomic updates. |
| **TC-236** | Review code modularity for the sales return/reversal flow. | Git commit history demonstrates atomic updates. |
| **TC-237** | Verify API latency for the receipt format generator. | Code follows best design practices. |
| **TC-238** | Check formatting rules for the receipt format generator. | Completes within strict SLA thresholds. |
| **TC-239** | Verify API latency for the total price logic. | Implementation isolated properly. |
| **TC-240** | Review git commits for the total price logic. | Completes within strict SLA thresholds. |

---

## 📦 MODULE: Forecast Management
**Responsible Member:** Jayamuni J. T. S. J.

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-241** | Read the model confidence metric. | Component processes logic without crash. |
| **TC-242** | Calculate the model retrain button. | Component processes logic without crash. |
| **TC-243** | Create the model confidence metric. | Database state updates correctly. |
| **TC-244** | Update the model confidence metric. | Component processes logic without crash. |
| **TC-245** | Calculate the sales anomaly detection. | Database state updates correctly. |
| **TC-246** | Read the historical sales API feeder. | Database state updates correctly. |
| **TC-247** | Update the model retrain button. | Database state updates correctly. |
| **TC-248** | Create the model confidence metric. | Component processes logic without crash. |
| **TC-249** | Calculate the model confidence metric. | Component processes logic without crash. |
| **TC-250** | Calculate the seasonality peak detection. | Operation persists on refresh. |
| **TC-251** | Export the model retrain button. | Database state updates correctly. |
| **TC-252** | Update the historical sales API feeder. | Database state updates correctly. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-253** | Verify scroll on the model confidence metric. | UX is intuitive and feedback is immediate. |
| **TC-254** | Test drag-and-drop on the upcoming forecast horizon slider. | Provides fluid visual transitions. |
| **TC-255** | Interact with the model retrain button. | UX is intuitive and feedback is immediate. |
| **TC-256** | Test breadcrumbs for the model retrain button. | Provides fluid visual transitions. |
| **TC-257** | Test drag-and-drop on the sales anomaly detection. | Provides fluid visual transitions. |
| **TC-258** | Check loading state of the sales anomaly detection. | UX is intuitive and feedback is immediate. |
| **TC-259** | Check loading state of the AI predictive restock recommendation. | Layout does not break on mobile width. |
| **TC-260** | Test drag-and-drop on the sales anomaly detection. | UX is intuitive and feedback is immediate. |
| **TC-261** | Test breadcrumbs for the upcoming forecast horizon slider. | No dead clicks or user confusion. |
| **TC-262** | Test drag-and-drop on the AI predictive restock recommendation. | No dead clicks or user confusion. |
| **TC-263** | Navigate to the AI predictive restock recommendation. | Action requires minimum steps. |
| **TC-264** | Check loading state of the upcoming forecast horizon slider. | Layout does not break on mobile width. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-265** | Input special characters to the model confidence metric. | Follows established design system. |
| **TC-266** | Check typography on the model retrain button. | Validations fire instantly. |
| **TC-267** | Check color contrasts in the upcoming forecast horizon slider. | Validations fire instantly. |
| **TC-268** | Check typography on the AI predictive restock recommendation. | Follows established design system. |
| **TC-269** | Input special characters to the AI predictive restock recommendation. | Follows established design system. |
| **TC-270** | Test max limits on the model retrain button. | No raw generic system errors exposed. |
| **TC-271** | Trigger 404 error using the upcoming forecast horizon slider. | No raw generic system errors exposed. |
| **TC-272** | Validate empty inputs on the AI predictive restock recommendation. | No raw generic system errors exposed. |
| **TC-273** | Check typography on the sales anomaly detection. | Inputs fail safely providing context. |
| **TC-274** | Test max limits on the model retrain button. | No raw generic system errors exposed. |
| **TC-275** | Input special characters to the upcoming forecast horizon slider. | No raw generic system errors exposed. |
| **TC-276** | Input special characters to the historical sales API feeder. | Validations fire instantly. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-277** | Rate limit test the sales anomaly detection. | Denies request with 401/403. |
| **TC-278** | Test XSS on the model confidence metric. | CORS policy correctly handles request. |
| **TC-279** | Inspect network payload on the model confidence metric. | Token is verfied successfully. |
| **TC-280** | Check session expiry on the AI predictive restock recommendation. | Prevents data leakage internally. |
| **TC-281** | Rate limit test the model retrain button. | CORS policy correctly handles request. |
| **TC-282** | Check session expiry on the model confidence metric. | Prevents data leakage internally. |
| **TC-283** | Rate limit test the model retrain button. | Denies request with 401/403. |
| **TC-284** | Attempt unauthorized access to the sales anomaly detection. | Token is verfied successfully. |
| **TC-285** | Verify JWT token validation in the upcoming forecast horizon slider. | CORS policy correctly handles request. |
| **TC-286** | Test XSS on the seasonality peak detection. | Token is verfied successfully. |
| **TC-287** | Test XSS on the historical sales API feeder. | CORS policy correctly handles request. |
| **TC-288** | Perform SQL Injection on the sales anomaly detection. | Denies request with 401/403. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-289** | Review git commits for the sales anomaly detection. | Git commit history demonstrates atomic updates. |
| **TC-290** | Review code modularity for the model confidence metric. | Completes within strict SLA thresholds. |
| **TC-291** | Check formatting rules for the sales anomaly detection. | Implementation isolated properly. |
| **TC-292** | Review code modularity for the seasonality peak detection. | Completes within strict SLA thresholds. |
| **TC-293** | Review code modularity for the model confidence metric. | Git commit history demonstrates atomic updates. |
| **TC-294** | Audit console logs in the sales anomaly detection. | Implementation isolated properly. |
| **TC-295** | Check formatting rules for the historical sales API feeder. | Warnings resolved systematically. |
| **TC-296** | Verify API latency for the upcoming forecast horizon slider. | Git commit history demonstrates atomic updates. |
| **TC-297** | Audit console logs in the AI predictive restock recommendation. | Completes within strict SLA thresholds. |
| **TC-298** | Verify API latency for the seasonality peak detection. | Warnings resolved systematically. |
| **TC-299** | Review git commits for the model confidence metric. | Completes within strict SLA thresholds. |
| **TC-300** | Review code modularity for the seasonality peak detection. | Warnings resolved systematically. |

---

## 📦 MODULE: Report Analytics Management
**Responsible Member:** Perera W.A.M.V.

### CRITERION 1 — Progress of Responsible Components
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-301** | Calculate the global top search bar. | Data exported with valid layout. |
| **TC-302** | Filter the global date-range picker. | Database state updates correctly. |
| **TC-303** | Sync the global date-range picker. | Data exported with valid layout. |
| **TC-304** | Read the monthly revenue bar chart. | Component processes logic without crash. |
| **TC-305** | Read the global date-range picker. | Database state updates correctly. |
| **TC-306** | Create the monthly revenue bar chart. | Operation persists on refresh. |
| **TC-307** | Update the recent platform activity feed. | Operation persists on refresh. |
| **TC-308** | Create the monthly revenue bar chart. | Component processes logic without crash. |
| **TC-309** | Sync the dashboard socket connection auto-refresh. | Component processes logic without crash. |
| **TC-310** | Create the dashboard socket connection auto-refresh. | Operation persists on refresh. |
| **TC-311** | Update the dashboard landing layout. | Database state updates correctly. |
| **TC-312** | Filter the PDF analytics exporter. | Operation persists on refresh. |

### CRITERION 2 — User Experience (Task Flow, Navigation)
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-313** | Check responsiveness of the monthly revenue bar chart. | UX is intuitive and feedback is immediate. |
| **TC-314** | Test drag-and-drop on the recent platform activity feed. | No dead clicks or user confusion. |
| **TC-315** | Interact with the PDF analytics exporter. | UX is intuitive and feedback is immediate. |
| **TC-316** | Test breadcrumbs for the PDF analytics exporter. | No dead clicks or user confusion. |
| **TC-317** | Navigate to the PDF analytics exporter. | Action requires minimum steps. |
| **TC-318** | Check loading state of the PDF analytics exporter. | No dead clicks or user confusion. |
| **TC-319** | Check loading state of the recent platform activity feed. | Action requires minimum steps. |
| **TC-320** | Navigate to the dashboard socket connection auto-refresh. | Layout does not break on mobile width. |
| **TC-321** | Test breadcrumbs for the monthly revenue bar chart. | Action requires minimum steps. |
| **TC-322** | Navigate to the monthly revenue bar chart. | No dead clicks or user confusion. |
| **TC-323** | Check responsiveness of the monthly revenue bar chart. | UX is intuitive and feedback is immediate. |
| **TC-324** | Test drag-and-drop on the recent platform activity feed. | Action requires minimum steps. |

### CRITERION 3 — UI Consistency, Standards, & Error Handling
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-325** | Check color contrasts in the PDF analytics exporter. | Validations fire instantly. |
| **TC-326** | Check color contrasts in the global date-range picker. | Follows established design system. |
| **TC-327** | Validate empty inputs on the PDF analytics exporter. | No raw generic system errors exposed. |
| **TC-328** | Check typography on the global date-range picker. | No raw generic system errors exposed. |
| **TC-329** | Verify success toast on the PDF analytics exporter. | Follows established design system. |
| **TC-330** | Verify success toast on the global top search bar. | Follows established design system. |
| **TC-331** | Check color contrasts in the dashboard socket connection auto-refresh. | Follows established design system. |
| **TC-332** | Input special characters to the global date-range picker. | Inputs fail safely providing context. |
| **TC-333** | Validate empty inputs on the recent platform activity feed. | No raw generic system errors exposed. |
| **TC-334** | Check typography on the global top search bar. | Validations fire instantly. |
| **TC-335** | Test max limits on the global date-range picker. | No raw generic system errors exposed. |
| **TC-336** | Verify success toast on the global date-range picker. | No raw generic system errors exposed. |

### CRITERION 5 — Testing & Basic Security
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-337** | Inspect network payload on the monthly revenue bar chart. | CORS policy correctly handles request. |
| **TC-338** | Test XSS on the global top search bar. | Denies request with 401/403. |
| **TC-339** | Check session expiry on the PDF analytics exporter. | Prevents data leakage internally. |
| **TC-340** | Perform SQL Injection on the global top search bar. | CORS policy correctly handles request. |
| **TC-341** | Check session expiry on the monthly revenue bar chart. | Token is verfied successfully. |
| **TC-342** | Test XSS on the PDF analytics exporter. | CORS policy correctly handles request. |
| **TC-343** | Verify JWT token validation in the dashboard landing layout. | Prevents data leakage internally. |
| **TC-344** | Rate limit test the monthly revenue bar chart. | Payloads are strictly sanitized against attacks. |
| **TC-345** | Perform SQL Injection on the dashboard landing layout. | Prevents data leakage internally. |
| **TC-346** | Test XSS on the global top search bar. | Prevents data leakage internally. |
| **TC-347** | Inspect network payload on the global date-range picker. | Denies request with 401/403. |
| **TC-348** | Attempt unauthorized access to the PDF analytics exporter. | Token is verfied successfully. |

### CRITERION 6 — Professionalism & Time Management
| TC ID | Scenario Description | Expected Result |
| :--- | :--- | :--- |
| **TC-349** | Review code modularity for the monthly revenue bar chart. | Warnings resolved systematically. |
| **TC-350** | Check formatting rules for the monthly revenue bar chart. | Git commit history demonstrates atomic updates. |
| **TC-351** | Check formatting rules for the PDF analytics exporter. | Code follows best design practices. |
| **TC-352** | Review test coverage for the global top search bar. | Code follows best design practices. |
| **TC-353** | Verify API latency for the dashboard socket connection auto-refresh. | Git commit history demonstrates atomic updates. |
| **TC-354** | Audit console logs in the dashboard landing layout. | Git commit history demonstrates atomic updates. |
| **TC-355** | Review test coverage for the dashboard socket connection auto-refresh. | Code follows best design practices. |
| **TC-356** | Review test coverage for the dashboard landing layout. | Code follows best design practices. |
| **TC-357** | Check error boundaries for the PDF analytics exporter. | Completes within strict SLA thresholds. |
| **TC-358** | Verify API latency for the dashboard socket connection auto-refresh. | Completes within strict SLA thresholds. |
| **TC-359** | Review code modularity for the dashboard socket connection auto-refresh. | Implementation isolated properly. |
| **TC-360** | Review git commits for the global top search bar. | Warnings resolved systematically. |

---

