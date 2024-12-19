// @ts-check

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  class ChatViewer {
    constructor() {
      /** @type {HTMLElement} */
      this.chatContainer = /** @type {HTMLElement} */ (
        document.getElementById("chatContainer")
      );
      /** @type {HTMLElement} */
      this.statusElement = /** @type {HTMLElement} */ (
        document.getElementById("status")
      );
      /** @type {HTMLElement} */
      this.refreshButton = /** @type {HTMLElement} */ (
        document.getElementById("refreshButton")
      );
      /** @type {HTMLElement} */
      this.searchButton = /** @type {HTMLElement} */ (
        document.getElementById("searchButton")
      );

      if (
        !this.chatContainer ||
        !this.statusElement ||
        !this.refreshButton ||
        !this.searchButton
      ) {
        throw new Error("Required DOM elements not found");
      }

      this.currentSequence = null;
      this.segments = [];
      this.virtualScroll = new VirtualScroll(this.chatContainer);

      this.initializeEventListeners();
    }

    initializeEventListeners() {
      // Handle refresh
      if (this.refreshButton) {
        this.refreshButton.addEventListener("click", () => {
          if (this.currentSequence) {
            vscode.postMessage({
              type: "loadSequence",
              sequenceId: this.currentSequence.id,
            });
          }
        });
      }

      // Handle search
      if (this.searchButton) {
        this.searchButton.addEventListener("click", () => {
          // TODO: Implement search functionality
        });
      }

      // Handle segment clicks
      if (this.chatContainer) {
        this.chatContainer.addEventListener("click", (e) => {
          const target = /** @type {HTMLElement} */ (e.target);
          if (!target) {
            return;
          }

          const segmentElement = target.closest(".chat-segment");
          if (segmentElement && segmentElement instanceof HTMLElement) {
            const segmentId = segmentElement.dataset.segmentId;
            vscode.postMessage({
              type: "jumpToSegment",
              segmentId,
            });
          }
        });
      }

      // Handle theme changes
      vscode.postMessage({
        type: "themeChanged",
        theme: document.body.className,
      });
    }

    loadSequence(sequence) {
      this.currentSequence = sequence;
      this.segments = sequence.segments;
      this.virtualScroll.setItems(this.segments);
      this.updateStatus(`Loaded ${this.segments.length} segments`);
    }

    updateTheme(colors) {
      const root = document.documentElement;
      if (!root) {
        return;
      }

      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--vscode-${key}`, value);
      });
    }

    updateStatus(message) {
      if (this.statusElement) {
        this.statusElement.textContent = message;
      }
    }
  }

  class VirtualScroll {
    constructor(container, itemHeight = 100) {
      this.container = container;
      this.itemHeight = itemHeight;
      this.items = [];
      this.visibleItems = new Map();
      this.lastScrollTop = 0;

      this.container.style.height = "100%";
      this.container.style.overflow = "auto";

      this.container.addEventListener("scroll", this.onScroll.bind(this));
      window.addEventListener("resize", this.onScroll.bind(this));
    }

    setItems(items) {
      this.items = items;
      this.container.style.height = `${items.length * this.itemHeight}px`;
      this.onScroll();
    }

    onScroll() {
      const scrollTop = this.container.scrollTop;
      const containerHeight = this.container.clientHeight;

      const startIndex = Math.floor(scrollTop / this.itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
        this.items.length
      );

      // Remove items that are no longer visible
      for (const [index, element] of this.visibleItems.entries()) {
        if (index < startIndex || index >= endIndex) {
          element.remove();
          this.visibleItems.delete(index);
        }
      }

      // Add new visible items
      for (let i = startIndex; i < endIndex; i++) {
        if (!this.visibleItems.has(i)) {
          const item = this.items[i];
          const element = this.createSegmentElement(item, i);
          this.container.appendChild(element);
          this.visibleItems.set(i, element);
        }
      }
    }

    createSegmentElement(segment, index) {
      const element = document.createElement("div");
      element.className = "chat-segment";
      element.dataset.segmentId = segment.id;
      element.style.position = "absolute";
      element.style.top = `${index * this.itemHeight}px`;
      element.style.width = "100%";

      const content = document.createElement("div");
      content.className = "segment-content";
      content.textContent = segment.content;

      const metadata = document.createElement("div");
      metadata.className = "segment-metadata";
      metadata.innerHTML = `
                <span class="metadata-item">
                    <i class="codicon codicon-person"></i>
                    ${segment.metadata.participants.join(", ")}
                </span>
                ${
                  segment.metadata.keywords?.length
                    ? `
                    <span class="metadata-item">
                        <i class="codicon codicon-tag"></i>
                        ${segment.metadata.keywords.join(", ")}
                    </span>
                `
                    : ""
                }
            `;

      element.appendChild(content);
      element.appendChild(metadata);
      return element;
    }
  }

  // Initialize the viewer
  const viewer = new ChatViewer();

  // Handle messages from the extension
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "sequenceLoaded":
        viewer.loadSequence(message.sequence);
        break;
      case "themeUpdated":
        viewer.updateTheme(message.colors);
        break;
    }
  });
})();
