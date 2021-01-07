import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AppsService,
  ReviewsService,
  FullAppData,
  Page,
  OCReviewDetails,
  OverallRatingSummary,
  FrontendService,
  DropdownModel, AppFormService, AppFormModel,
} from 'oc-ng-common-service';
import { ActivatedRoute, Router } from '@angular/router';
import {Subject, Observable} from 'rxjs';
import {map, takeUntil, tap} from 'rxjs/operators';
import {pageConfig} from '../../../../assets/data/configData';
import {LoaderService} from '@core/services/loader.service';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {FormModalComponent} from '@shared/modals/form-modal/form-modal.component';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-app-detail',
  templateUrl: './app-detail.component.html',
  styleUrls: ['./app-detail.component.scss']
})
export class AppDetailComponent implements OnInit, OnDestroy {

  app: FullAppData;
  recommendedApps: FullAppData [] = [];
  appData$: Observable<FullAppData>;
  overallRating: OverallRatingSummary = new OverallRatingSummary();

  reviewsPage: Page<OCReviewDetails>;

  reviewsSorts: DropdownModel<string>[];
  selectedSort: DropdownModel<string>;

  reviewsFilter: DropdownModel<string>[] = [
      new DropdownModel('All Stars', null),
      new DropdownModel('5 Stars', `{'rating': 500}`),
      new DropdownModel('4 Stars', `{'rating': 400}`),
      new DropdownModel('3 Stars', `{'rating': 300}`),
      new DropdownModel('2 Stars', `{'rating': 200}`),
      new DropdownModel('1 Stars', `{'rating': 100}`),
  ];
  selectedFilter: DropdownModel<string> = this.reviewsFilter[0];


  private destroy$: Subject<void> = new Subject();
  private appConfigPipe = pageConfig.fieldMappings;
  private contactForm: AppFormModel;

  constructor(private appService: AppsService,
              private reviewsService: ReviewsService,
              private frontendService: FrontendService,
              private loaderService: LoaderService,
              private route: ActivatedRoute,
              private router: Router,
              private modalService: NgbModal,
              private formService: AppFormService,
              private toaster: ToastrService) { }

  ngOnInit(): void {
    const appId = this.route.snapshot.paramMap.get('appId');

    this.loaderService.showLoader('1');

    this.appData$ = this.appService.getAppById(appId)
        .pipe(takeUntil(this.destroy$),
              map(app => new FullAppData(app, pageConfig.fieldMappings)),
              tap(app => this.app = app));

    this.appData$.subscribe(app => {
          this.loaderService.closeLoader('1');
          this.loadReviews();
        },
                            err => this.loaderService.closeLoader('1'));

    this.frontendService.getSorts()
        .pipe(takeUntil(this.destroy$))
        .subscribe(page => {
          this.reviewsSorts = page.list[0] ?
              page.list[0].values.map(value => new DropdownModel<string>(value.label, value.sort)) : null;
    });

    this.getRecommendedApps();
    this.getContactForm();

    this.router.routeReuseStrategy.shouldReuseRoute = () => {
      return false;
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(): void {
    this.loaderService.showLoader('2');
    this.reviewsService.getReviewsByAppId(this.app.appId, this.selectedSort ? this.selectedSort.value : null,
        this.selectedFilter ? this.selectedFilter.value : null)
        .pipe(takeUntil(this.destroy$),
            tap((page: Page<OCReviewDetails>) => this.reviewsPage = page))
        .subscribe(page => {
              this.loaderService.closeLoader('2');
              if (this.overallRating.rating === 0) {
                this.countRating();
              }
            },
            err => this.loaderService.closeLoader('2'));
  }

  onReviewSortChange(selected: DropdownModel<string>): void {
    this.selectedSort = selected;
    this.loadReviews();
  }

  onReviewFilterChange(selected: DropdownModel<string>): void {
    this.selectedFilter = selected;
    this.loadReviews();
  }

  getRecommendedApps(): void {
    this.loaderService.showLoader('3');

    this.appService.getApps(1, 3, '{randomize: 1}', '{\'status.value\':\'approved\'}').pipe(
      takeUntil(this.destroy$))
      .subscribe(apps => {
        this.recommendedApps = apps.list.map(app => new FullAppData(app, this.appConfigPipe));
        this.loaderService.closeLoader('3');
      }, () => {
        this.loaderService.closeLoader('3');
      });
  }

  private countRating(): void {
    this.overallRating = new OverallRatingSummary(this.app.rating / 100, this.reviewsPage.count);
    this.reviewsPage.list.forEach(review => this.overallRating[review.rating / 100]++);
  }

  openContactForm() {
    const modalRef = this.modalService.open(FormModalComponent, { size: 'lg' });
    modalRef.componentInstance.formData = this.contactForm;
    modalRef.componentInstance.modalTitle = 'Contact form';

    modalRef.result.then(value => {
      if (value) {
        this.loaderService.showLoader('contactForm');
        this.formService.createFormSubmission(this.contactForm.formId, {
          appId: this.app.appId,
          name: value.name,
          userId: '',
          email: value.email,
          formData: {
            ...value,
          },
        }).pipe(takeUntil(this.destroy$))
          .subscribe(() => {
              this.loaderService.closeLoader('contactForm');
              this.toaster.success('Your message was sent to the Developer');
            },
            () => {
              this.loaderService.closeLoader('contactForm');
              this.toaster.error('Your message wasn\'t sent to the Developer');
            });
      }
    });
  }

  private getContactForm() {
    this.formService.getForm('lead')
      .pipe(takeUntil(this.destroy$))
      .subscribe(form => {
        this.contactForm = form;
      });
  }

  get isDownloadRendered(): boolean {
    return true;
  }
}