// JavaScript Document

/**
 * Returns `true` if the given element is in a horizontal RTL writing mode.
 * @param {HTMLElement} element
 */
const isRtl = (element) => window.getComputedStyle(element).direction === 'rtl';

/**
 * Returns the distance from the starting edge of the viewport to the given focal point on the element.
 * @param {HTMLElement} element
 * @param {'start'|'center'|'end'} [focalPoint]
 */
const getDistanceToFocalPoint = (element, focalPoint = 'center') => {
  const isHorizontalRtl = isRtl(element);
  const documentWidth = document.documentElement.clientWidth;
  const rect = element.getBoundingClientRect();
  switch (focalPoint) {
    case 'start':
      return isHorizontalRtl ? documentWidth - rect.right : rect.left;
    case 'end':
      return isHorizontalRtl ? documentWidth - rect.left : rect.right;
    case 'center':
    default: {
      const centerFromLeft = rect.left + rect.width / 2;
      return isHorizontalRtl ? documentWidth - centerFromLeft : centerFromLeft;
    }
  }
};

class Carousel {
  constructor(props) {
    this._handleCarouselScroll = throttle(this._handleCarouselScroll.bind(this), 200);
    this.navigateToNextItem = this.navigateToNextItem.bind(this);

    this.carousel = props.root;
    this.scrollContainer = this.carousel.querySelector('[role="region"][tabindex="0"]');
    this.mediaList = this.scrollContainer.querySelector('[role="list"]');

    const controls = document.createElement('ol');
    controls.setAttribute('role', 'list');
    controls.classList.add('carousel-controls');
    controls.setAttribute('aria-label', 'Navigation controls');

    /**
     * @param {'start'|'end'} direction
     */
    const createNavButton = (direction) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.classList.add('carousel-control', direction);
      button.setAttribute('aria-label', direction === 'start' ? 'Previous' : 'Next');
      button.innerHTML = direction === 'start' ? ChevronLeft : ChevronRight;
      button.addEventListener('click', (e) => {
        if (e.currentTarget.getAttribute('aria-disabled') === 'true') return;
        this.navigateToNextItem(direction);
      });
      li.appendChild(button);
      controls.appendChild(li);
      return button;
    };

    this.navControlPrevious = createNavButton('start');
    this.navControlNext = createNavButton('end');
    this.carousel.appendChild(controls);

    this.scrollContainer.addEventListener(
      'scroll', this._handleCarouselScroll
    );
    this._handleCarouselScroll();
  }

  _handleCarouselScroll() {
    // scrollLeft is negative in a right-to-left writing mode
    const scrollLeft = Math.abs(this.scrollContainer.scrollLeft);
    // off-by-one correction for Chrome, where clientWidth is sometimes rounded down
    const width = this.scrollContainer.clientWidth + 1;
    const isAtStart = Math.floor(scrollLeft) === 0;
    const isAtEnd = Math.ceil(width + scrollLeft) >= this.scrollContainer.scrollWidth;
    this.navControlPrevious.setAttribute('aria-disabled', isAtStart);
    this.navControlNext.setAttribute('aria-disabled', isAtEnd);
  }

  /**
   * @param {'start'|'end'} direction
   */
  navigateToNextItem(direction) {
    let mediaItems = Array.from(this.mediaList.querySelectorAll(':scope > *'));
    mediaItems = direction === 'start' ? mediaItems.reverse() : mediaItems;

    // Basic idea: Find the first item whose focal point is past
    // the scroll container's center in the direction of travel.
    const scrollContainerCenter = getDistanceToFocalPoint(this.scrollContainer, 'center');
    let targetFocalPoint;
    for (const mediaItem of mediaItems) {
      let focalPoint = window.getComputedStyle(mediaItem).scrollSnapAlign;
      if (focalPoint === 'none') {
        focalPoint = 'center';
      }
      const distanceToItem = getDistanceToFocalPoint(mediaItem, focalPoint);
      if (
        (direction === 'start' && distanceToItem + 1 < scrollContainerCenter) ||
        (direction === 'end' && distanceToItem - scrollContainerCenter > 1)
      ) {
        targetFocalPoint = distanceToItem;
        break;
      }
    }

    // This should never happen, but it doesn't hurt to check
    if (typeof targetFocalPoint === 'undefined') return;
    // RTL flips the direction
    const sign = isRtl(this.carousel) ? -1 : 1;
    const scrollAmount = sign * (targetFocalPoint - scrollContainerCenter);
    this.scrollContainer.scrollBy({ left: scrollAmount });
  }
}

const carousel = new Carousel({
  root: document.querySelector('.carousel'),
});
