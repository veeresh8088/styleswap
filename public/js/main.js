/**
 * Styleswap - Client Side JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Flash Message Auto-dismiss
  const alerts = document.querySelectorAll('.flash-alert');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.5s ease';
      setTimeout(() => alert.remove(), 500);
    }, 6000);
  });

  // 2. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // 3. User Avatar Dropdown
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');
  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenuDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      if (!userMenuDropdown.classList.contains('hidden')) {
        userMenuDropdown.classList.add('hidden');
      }
    });
  }

  // 4. Multiple Image File Upload Preview
  const imageInput = document.getElementById('images-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  if (imageInput && imagePreviewContainer) {
    imageInput.addEventListener('change', (e) => {
      imagePreviewContainer.innerHTML = '';
      const files = Array.from(e.target.files);

      if (files.length > 5) {
        alert('You can upload a maximum of 5 images per listing.');
        imageInput.value = '';
        return;
      }

      files.forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const div = document.createElement('div');
          div.className = 'relative group rounded-lg overflow-hidden border border-amber-200 bg-amber-50 aspect-square shadow-sm';
          div.innerHTML = `
            <img src="${event.target.result}" alt="Upload preview ${index + 1}" class="w-full h-full object-cover">
            <span class="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-mono">${(file.size / (1024 * 1024)).toFixed(1)}MB</span>
          `;
          imagePreviewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // 5. Listing Type Dynamic Field Behavior (Hide/Show price if exchange-only)
  const listingTypeSelect = document.getElementById('listing-type-select');
  const priceInputContainer = document.getElementById('price-input-container');
  const exchangePrefContainer = document.getElementById('exchange-pref-container');

  if (listingTypeSelect && priceInputContainer) {
    const handleTypeChange = () => {
      const type = listingTypeSelect.value;
      if (type === 'exchange') {
        priceInputContainer.classList.add('opacity-50', 'pointer-events-none');
        const priceInput = priceInputContainer.querySelector('input');
        if (priceInput) priceInput.value = '0';
        if (exchangePrefContainer) exchangePrefContainer.classList.remove('hidden');
      } else {
        priceInputContainer.classList.remove('opacity-50', 'pointer-events-none');
        if (exchangePrefContainer && type === 'sell') {
          exchangePrefContainer.classList.add('hidden');
        } else if (exchangePrefContainer) {
          exchangePrefContainer.classList.remove('hidden');
        }
      }
    };
    listingTypeSelect.addEventListener('change', handleTypeChange);
    handleTypeChange();
  }

  // 6. User Dashboard Tab Switcher
  const hash = window.location.hash || '#listings';
  switchTab(hash.replace('#', ''));

  window.addEventListener('hashchange', () => {
    switchTab(window.location.hash.replace('#', ''));
  });

  // 7. Exchange Modal Item Selection
  const exchangeItemCards = document.querySelectorAll('.exchange-select-card');
  const selectedExchangeInput = document.getElementById('selected-exchange-item-id');

  exchangeItemCards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemId = card.getAttribute('data-item-id');
      const titleEl = card.querySelector('p');
      const itemTitle = titleEl ? titleEl.innerText : '';
      if (typeof window.selectExchangeItem === 'function') {
        window.selectExchangeItem(card, itemId, itemTitle);
      } else {
        exchangeItemCards.forEach((c) => {
          c.classList.remove('border-indigo-600', 'ring-2', 'ring-indigo-500/30', 'bg-indigo-50/50');
          c.classList.add('border-gray-200', 'bg-white');
        });
        card.classList.remove('border-gray-200', 'bg-white');
        card.classList.add('border-indigo-600', 'ring-2', 'ring-indigo-500/30', 'bg-indigo-50/50');
        if (selectedExchangeInput) {
          selectedExchangeInput.value = itemId;
        }
        const submitBtn = document.getElementById('submit-exchange-btn');
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  });

  // 8. Size Pill Selector Synchronization
  const sizePills = document.querySelectorAll('.size-pill');
  const sizeInput = document.getElementById('listing-size-input');

  const highlightSelectedPill = (sizeVal) => {
    if (!sizeVal) return;
    const cleanVal = sizeVal.trim().toLowerCase();
    sizePills.forEach((p) => {
      const pillVal = (p.getAttribute('data-size') || '').trim().toLowerCase();
      if (pillVal && (pillVal === cleanVal || `waist ${pillVal}` === cleanVal || cleanVal === `waist ${pillVal}`)) {
        p.classList.add('border-gray-900', 'bg-gray-900', 'text-white');
        p.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
      } else {
        p.classList.remove('border-gray-900', 'bg-gray-900', 'text-white');
        p.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
      }
    });
  };

  if (sizePills.length > 0 && sizeInput) {
    sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const selectedSize = pill.getAttribute('data-size');
        sizeInput.value = selectedSize;
        highlightSelectedPill(selectedSize);
      });
    });

    sizeInput.addEventListener('input', () => {
      highlightSelectedPill(sizeInput.value);
    });

    if (sizeInput.value) {
      highlightSelectedPill(sizeInput.value);
    }
  }

  // 9. AI Recommendation Assistant (Title, Price in ₹, Size, Description)
  const aiGenerateBtn = document.getElementById('ai-generate-btn');
  const aiPromptInput = document.getElementById('ai-prompt-input');
  const aiLoadingState = document.getElementById('ai-loading-state');
  const aiResultsCard = document.getElementById('ai-results-card');

  const titleInput = document.getElementById('listing-title-input');
  const categorySelect = document.getElementById('listing-category-select');
  const conditionSelect = document.getElementById('listing-condition-select');
  const priceInput = document.getElementById('listing-price-input');
  const descInput = document.getElementById('listing-desc-input');

  let currentAIRecommendations = null;

  const flashField = (elem) => {
    if (!elem) return;
    elem.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/40');
    setTimeout(() => {
      elem.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50/40');
    }, 1500);
  };

  const fetchAIRecommendations = async (targetField = null) => {
    const keywords = (aiPromptInput && aiPromptInput.value.trim()) || (titleInput && titleInput.value.trim()) || '';
    if (!keywords) {
      if (aiPromptInput) {
        aiPromptInput.focus();
        aiPromptInput.classList.add('ring-2', 'ring-rose-500');
        setTimeout(() => aiPromptInput.classList.remove('ring-2', 'ring-rose-500'), 2000);
      }
      alert('Please enter an item name or brand keywords first (e.g. Zara vintage blazer, Nike Jordan, Levi\'s 501).');
      return null;
    }

    const categoryOption = categorySelect ? categorySelect.options[categorySelect.selectedIndex] : null;
    const categoryName = categoryOption ? (categoryOption.getAttribute('data-name') || categoryOption.text) : '';
    const condition = conditionSelect ? conditionSelect.value : 'Good';

    if (aiLoadingState) aiLoadingState.classList.remove('hidden');
    if (aiResultsCard) aiResultsCard.classList.add('hidden');
    if (aiGenerateBtn) aiGenerateBtn.disabled = true;

    try {
      const response = await fetch('/api/listings/ai-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          category: categoryName,
          condition
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch recommendations');
      }

      currentAIRecommendations = result.data;

      // Populate preview card
      const previewTitle = document.getElementById('ai-preview-title');
      const previewPrice = document.getElementById('ai-preview-price');
      const previewRange = document.getElementById('ai-preview-range');
      const previewTip = document.getElementById('ai-preview-tip');
      const previewSize = document.getElementById('ai-preview-size');
      const previewDesc = document.getElementById('ai-preview-desc');

      if (previewTitle) previewTitle.textContent = currentAIRecommendations.title || '';
      if (previewPrice) previewPrice.textContent = `₹${Number(currentAIRecommendations.price || 0).toLocaleString('en-IN')}`;
      if (previewRange && currentAIRecommendations.priceRange) {
        previewRange.textContent = `(Fair: ₹${Number(currentAIRecommendations.priceRange.min).toLocaleString('en-IN')} - ₹${Number(currentAIRecommendations.priceRange.max).toLocaleString('en-IN')})`;
      }
      if (previewTip) previewTip.textContent = currentAIRecommendations.conditionTip || currentAIRecommendations.priceRange?.rationale || '';
      if (previewSize) previewSize.textContent = currentAIRecommendations.size || 'M';
      if (previewDesc) previewDesc.textContent = currentAIRecommendations.description || '';

      if (aiResultsCard) aiResultsCard.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();

      // If specific target field requested
      if (targetField === 'title' && titleInput) {
        titleInput.value = currentAIRecommendations.title;
        flashField(titleInput);
      } else if (targetField === 'price' && priceInput) {
        priceInput.value = currentAIRecommendations.price;
        flashField(priceInput);
      } else if (targetField === 'description' && descInput) {
        descInput.value = currentAIRecommendations.description;
        flashField(descInput);
      }

      return currentAIRecommendations;
    } catch (err) {
      console.error('AI recommendation error:', err);
      alert('Could not retrieve AI recommendations. Please check connection and try again.');
      return null;
    } finally {
      if (aiLoadingState) aiLoadingState.classList.add('hidden');
      if (aiGenerateBtn) aiGenerateBtn.disabled = false;
    }
  };

  if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener('click', () => fetchAIRecommendations());
  }

  // Quick field triggers
  const quickBtns = document.querySelectorAll('.ai-quick-btn');
  quickBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-target');
      if (currentAIRecommendations) {
        if (target === 'title' && titleInput) {
          titleInput.value = currentAIRecommendations.title;
          flashField(titleInput);
        } else if (target === 'price' && priceInput) {
          priceInput.value = currentAIRecommendations.price;
          flashField(priceInput);
        } else if (target === 'description' && descInput) {
          descInput.value = currentAIRecommendations.description;
          flashField(descInput);
        }
      } else {
        await fetchAIRecommendations(target);
      }
    });
  });

  // Apply individual preview actions
  const applyTitleBtn = document.getElementById('ai-apply-title-btn');
  if (applyTitleBtn) {
    applyTitleBtn.addEventListener('click', () => {
      if (currentAIRecommendations && titleInput) {
        titleInput.value = currentAIRecommendations.title;
        flashField(titleInput);
      }
    });
  }

  const applyPriceBtn = document.getElementById('ai-apply-price-btn');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      if (currentAIRecommendations && priceInput) {
        priceInput.value = currentAIRecommendations.price;
        flashField(priceInput);
      }
    });
  }

  const applySizeBtn = document.getElementById('ai-apply-size-btn');
  if (applySizeBtn) {
    applySizeBtn.addEventListener('click', () => {
      if (currentAIRecommendations && sizeInput) {
        sizeInput.value = currentAIRecommendations.size;
        highlightSelectedPill(currentAIRecommendations.size);
        flashField(sizeInput);
      }
    });
  }

  const applyDescBtn = document.getElementById('ai-apply-desc-btn');
  if (applyDescBtn) {
    applyDescBtn.addEventListener('click', () => {
      if (currentAIRecommendations && descInput) {
        descInput.value = currentAIRecommendations.description;
        flashField(descInput);
      }
    });
  }

  const applyAllBtn = document.getElementById('ai-apply-all-btn');
  if (applyAllBtn) {
    applyAllBtn.addEventListener('click', () => {
      if (!currentAIRecommendations) return;
      if (titleInput && currentAIRecommendations.title) {
        titleInput.value = currentAIRecommendations.title;
        flashField(titleInput);
      }
      if (priceInput && currentAIRecommendations.price) {
        priceInput.value = currentAIRecommendations.price;
        flashField(priceInput);
      }
      if (sizeInput && currentAIRecommendations.size) {
        sizeInput.value = currentAIRecommendations.size;
        highlightSelectedPill(currentAIRecommendations.size);
        flashField(sizeInput);
      }
      if (descInput && currentAIRecommendations.description) {
        descInput.value = currentAIRecommendations.description;
        flashField(descInput);
      }
      applyAllBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Applied!';
      applyAllBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
      applyAllBtn.classList.add('bg-gray-900');
      setTimeout(() => {
        applyAllBtn.innerHTML = '<i data-lucide="check-check" class="w-3.5 h-3.5"></i> Apply All to Form';
        applyAllBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        applyAllBtn.classList.remove('bg-gray-900');
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
      if (window.lucide) window.lucide.createIcons();
    });
  }
});

// Helper to switch dashboard tabs
function switchTab(tabName) {
  const tabButtons = document.querySelectorAll('.dashboard-tab-btn');
  const tabPanes = document.querySelectorAll('.dashboard-tab-pane');

  if (tabButtons.length === 0 || tabPanes.length === 0) return;

  tabButtons.forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('border-amber-600', 'text-amber-700', 'bg-amber-50/60');
      btn.classList.remove('border-transparent', 'text-gray-500');
    } else {
      btn.classList.remove('border-amber-600', 'text-amber-700', 'bg-amber-50/60');
      btn.classList.add('border-transparent', 'text-gray-500');
    }
  });

  tabPanes.forEach((pane) => {
    if (pane.id === `tab-${tabName}`) {
      pane.classList.remove('hidden');
    } else {
      pane.classList.add('hidden');
    }
  });
}

// Modal Open/Close Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';
  }
}
