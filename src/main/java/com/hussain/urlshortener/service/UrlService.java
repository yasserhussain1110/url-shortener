package com.hussain.urlshortener.service;

import com.hussain.urlshortener.config.CacheConfig;
import com.hussain.urlshortener.exception.UrlNotFoundException;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UrlService {
    private final UrlRepository urlRepository;

    public Url shorten(Url url) {
        try {
            return urlRepository.save(url);
        } catch (DataIntegrityViolationException e) {
            return urlRepository.findByOriginalUrl(url.getOriginalUrl())
                    .orElseThrow();
        }
    }

    @Cacheable(value = CacheConfig.URLS_CACHE, key = "#id")
    public Url expand(Long id) {
        return urlRepository.findById(id).orElseThrow(UrlNotFoundException::new);
    }

    public List<Url> findAll() {
        return urlRepository.findAll();
    }
}
