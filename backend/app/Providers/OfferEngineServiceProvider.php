<?php

namespace App\Providers;

use App\Services\OfferEngine\Calculators\BogoDiscountCalculator;
use App\Services\OfferEngine\Calculators\BulkDiscountCalculator;
use App\Services\OfferEngine\Calculators\BundleDiscountCalculator;
use App\Services\OfferEngine\Calculators\BxgxDiscountCalculator;
use App\Services\OfferEngine\Calculators\CartDiscountCalculator;
use App\Services\OfferEngine\Calculators\ProductDiscountCalculator;
use App\Services\OfferEngine\Checkers\RuleActivationChecker;
use App\Services\OfferEngine\Checkers\ScheduleChecker;
use App\Services\OfferEngine\Filters\EligibilityFilter;
use App\Services\OfferEngine\Filters\FilterMatcher;
use App\Services\OfferEngine\OfferEngineService;
use App\Services\OfferEngine\PromotionMessageService;
use App\Services\OfferEngine\Validators\ConditionValidator;
use Illuminate\Support\ServiceProvider;

class OfferEngineServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register filters
        $this->app->singleton(FilterMatcher::class);
        $this->app->singleton(EligibilityFilter::class, function ($app) {
            return new EligibilityFilter($app->make(FilterMatcher::class));
        });

        // Register checkers
        $this->app->singleton(ScheduleChecker::class);
        $this->app->singleton(RuleActivationChecker::class, function ($app) {
            return new RuleActivationChecker($app->make(ScheduleChecker::class));
        });

        // Register validators
        $this->app->singleton(ConditionValidator::class);

        // Register calculators
        $this->app->singleton(ProductDiscountCalculator::class, function ($app) {
            return new ProductDiscountCalculator($app->make(EligibilityFilter::class));
        });
        $this->app->singleton(CartDiscountCalculator::class, function ($app) {
            return new CartDiscountCalculator($app->make(EligibilityFilter::class));
        });
        $this->app->singleton(BulkDiscountCalculator::class, function ($app) {
            return new BulkDiscountCalculator($app->make(EligibilityFilter::class));
        });
        $this->app->singleton(BundleDiscountCalculator::class, function ($app) {
            return new BundleDiscountCalculator($app->make(EligibilityFilter::class));
        });
        $this->app->singleton(BogoDiscountCalculator::class, function ($app) {
            return new BogoDiscountCalculator($app->make(EligibilityFilter::class));
        });
        $this->app->singleton(BxgxDiscountCalculator::class);

        // Register main service
        $this->app->singleton(OfferEngineService::class, function ($app) {
            return new OfferEngineService(
                $app->make(RuleActivationChecker::class),
                $app->make(EligibilityFilter::class),
                $app->make(ConditionValidator::class),
                $app->make(ProductDiscountCalculator::class),
                $app->make(CartDiscountCalculator::class),
                $app->make(BulkDiscountCalculator::class),
                $app->make(BundleDiscountCalculator::class),
                $app->make(BogoDiscountCalculator::class),
                $app->make(BxgxDiscountCalculator::class),
            );
        });

        // Register promotion message service (simplified - no dependencies)
        $this->app->singleton(PromotionMessageService::class);

        // Register alias for easy access
        $this->app->alias(OfferEngineService::class, 'offer-engine');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
